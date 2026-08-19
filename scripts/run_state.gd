## Estado persistente da "run" atual — autoload (ver project.godot
## [autoload]), sobrevive à troca de cena entre map_select.tscn,
## duel_scene.tscn e shop.tscn. Guarda a rush, o ouro acumulado, a vida do
## jogador (persiste entre duelos, só é curada ao vencer), o baralho do
## jogador (mutável — a loja compra cartas novas e aplica melhorias nele)
## e qual estágio da rota de cruzada (4 combates evitáveis + o Rei) o
## jogador já liberou/está jogando, junto com a personalidade sorteada do
## oponente de cada um.
extends Node

enum Stage { OUTPOST, VILLAGE, GARRISON, STRONGHOLD, KING }

## Ordem da rota — da esquerda pra direita no mapa.
const STAGE_ORDER: Array[Stage] = [
	Stage.OUTPOST, Stage.VILLAGE, Stage.GARRISON, Stage.STRONGHOLD, Stage.KING
]

const STAGE_TITLE: Dictionary = {
	Stage.OUTPOST: "Acampamento Fronteiriço",
	Stage.VILLAGE: "Vilarejo Ocupado",
	Stage.GARRISON: "Posto Avançado",
	Stage.STRONGHOLD: "Muralhas da Fortaleza",
	Stage.KING: "Castelo do Rei",
}
const STAGE_DESC: Dictionary = {
	Stage.OUTPOST: "Um bando de saqueadores guarda a passagem.",
	Stage.VILLAGE: "Tropas inimigas tomaram este vilarejo pacífico.",
	Stage.GARRISON: "Uma guarnição fortificada vigia o caminho.",
	Stage.STRONGHOLD: "O último bastião antes do castelo real.",
	Stage.KING: "O trono em si. Não há como evitar esta batalha.",
}
const GOLD_REWARD: Dictionary = {
	Stage.OUTPOST: 2,
	Stage.VILLAGE: 3,
	Stage.GARRISON: 4,
	Stage.STRONGHOLD: 5,
}

const MAP_SCENE_PATH: String = "res://scenes/map_select.tscn"
const DUEL_SCENE_PATH: String = "res://scenes/duel_scene.tscn"
const SHOP_SCENE_PATH: String = "res://scenes/shop.tscn"

const PLAYER_BASE_MAX_HP: int = 20
## Vida recuperada ao vencer QUALQUER combate (não cura tudo — só isso,
## até o teto de max_hp()).
const PLAYER_HEAL_PER_WIN: int = 4

## Número da rush atual — começa em 1, +1 a cada Rei derrotado.
var rush: int = 1
var gold: int = 0
## Vida do jogador, persistida entre duelos da mesma run (não reseta a
## cada combate — só ao vencer, ver apply_victory_heal()).
var player_hp: int = PLAYER_BASE_MAX_HP
## Somado a PLAYER_BASE_MAX_HP pela melhoria "+10 de Vida" da loja — ver
## max_hp() e Shop._on_buy_hp().
var max_hp_bonus: int = 0

## Estágio que o mapa libera pra jogar/evitar agora (o "próximo" da rota).
var current_stage: Stage = Stage.OUTPOST

## Estágio realmente sendo jogado em duel_scene.tscn agora — setado por
## start_fight() antes de trocar de cena, consultado por DuelScene pra
## saber a personalidade do oponente e se é a luta do Rei.
var fighting_stage: Stage = Stage.OUTPOST

## Personalidade sorteada pra cada estágio desta rota — sorteadas todas de
## uma vez no início do ciclo (reset_run() ou ao vencer o Rei), pra
## poderem ser mostradas no mapa antes do jogador escolher lutar.
var stage_personalities: Dictionary = {}  # Stage -> EnemyPersonality

## Baralho do jogador nesta run: cópias mutáveis das cartas cadastradas em
## DuelScene.player_deck_data, pra loja poder comprar cartas novas e
## aplicar melhorias de Ataque/Defesa sem alterar os Resources originais
## do disco. Semeado uma vez por DuelScene.ensure_player_pool() (vazio
## após reset_run(), então a primeira partida de cada run resemeia do
## zero — melhorias da run anterior não vazam pra próxima).
var player_card_pool: Array[CardResource] = []

## Catálogo de cartas disponíveis pra loja oferecer — semeado uma vez por
## DuelScene (a partir do pool do oponente) e mantido pelo resto da
## sessão; não precisa resetar por run, é só referência de dados.
var card_catalog: Array[CardResource] = []


func _ready() -> void:
	_roll_new_cycle_personalities()


func max_hp() -> int:
	return PLAYER_BASE_MAX_HP + max_hp_bonus


## Volta a run pro estado inicial — chamado numa derrota (perder o duelo
## custa a rush inteira, igual a um Balatro perdendo a run). O baralho
## (player_card_pool) e as melhorias compradas também se perdem.
func reset_run() -> void:
	rush = 1
	gold = 0
	max_hp_bonus = 0
	player_hp = PLAYER_BASE_MAX_HP
	current_stage = Stage.OUTPOST
	player_card_pool.clear()
	_roll_new_cycle_personalities()


func is_king_fight() -> bool:
	return fighting_stage == Stage.KING


func personality_for(stage: Stage) -> EnemyPersonality:
	return stage_personalities.get(stage)


## Semeia player_card_pool a partir de `seed_cards` (cópias, pra não
## mutar os Resources originais) — só na primeira vez de cada run (fica
## vazio de novo em reset_run()). Chamado por DuelScene._ready().
func ensure_player_pool(seed_cards: Array[CardResource]) -> void:
	if not player_card_pool.is_empty():
		return
	for card in seed_cards:
		if card:
			player_card_pool.append(card.duplicate())


## Semeia card_catalog uma única vez (nunca reseta) — chamado por
## DuelScene._ready(). Não duplica: são só ofertas de referência pra loja
## mostrar; a cópia de verdade acontece em Shop._on_buy_card().
func ensure_card_catalog(seed_cards: Array[CardResource]) -> void:
	if not card_catalog.is_empty():
		return
	card_catalog = seed_cards.duplicate()


## Gasta `amount` de ouro se houver o suficiente. Retorna false (sem
## alterar nada) se não der pra pagar — usado pela loja antes de cada compra.
func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	return true


## Melhoria "+10 de Vida" da loja: aumenta o teto de vida da run e já cura
## o mesmo tanto na hora.
func buy_max_hp_upgrade(amount: int) -> void:
	max_hp_bonus += amount
	player_hp = mini(player_hp + amount, max_hp())


## Melhorias "+1 Ataque/Defesa em N cartas aleatórias" da loja — aplica
## +1 no atributo escolhido ("attack" ou "defense") de até `count` cartas
## distintas sorteadas de player_card_pool.
func buff_random_cards(stat: String, count: int) -> void:
	var pool := player_card_pool.duplicate()
	pool.shuffle()
	for i in range(mini(count, pool.size())):
		var card: CardResource = pool[i]
		if stat == "attack":
			card.attack += 1
		else:
			card.defense += 1


## Cura o jogador em PLAYER_HEAL_PER_WIN a partir de `current_hp` (a vida
## dele ao final do combate recém-vencido), até o teto de max_hp().
## Chamado por DuelScene ANTES de report_victory(), pra poder mostrar o
## valor final no modal de vitória.
func apply_victory_heal(current_hp: int) -> int:
	player_hp = mini(current_hp + PLAYER_HEAL_PER_WIN, max_hp())
	return player_hp


## Chamado pelos botões "Lutar" do mapa: marca qual estágio está sendo
## disputado e troca pra cena do duelo.
func start_fight(stage: Stage) -> void:
	fighting_stage = stage
	get_tree().change_scene_to_file(DUEL_SCENE_PATH)


## Chamado pelo botão "Evitar" — pula o estágio atual sem ouro nem loja. O
## Rei nunca pode ser evitado (ver MapStageCard, que nem mostra o botão
## nesse caso).
func avoid_stage() -> void:
	if current_stage == Stage.KING:
		return
	current_stage = STAGE_ORDER[STAGE_ORDER.find(current_stage) + 1]


## Chamado por DuelScene ao vencer o duelo (nunca ao evitar): paga o ouro
## do estágio (nada pelo Rei) e manda pra loja — a rota só avança de fato
## quando o jogador sai da loja (ver advance_after_shop()).
func report_victory() -> void:
	if fighting_stage != Stage.KING:
		gold += GOLD_REWARD.get(fighting_stage, 0)

	get_tree().change_scene_to_file(SHOP_SCENE_PATH)


## Chamado pelo botão "Avançar" da loja: avança a rota e, se o vencido foi
## o Rei, soma +1 de rush e sorteia um novo ciclo de personalidades.
## Sempre volta pro mapa.
func advance_after_shop() -> void:
	if fighting_stage == Stage.KING:
		rush += 1
		current_stage = Stage.OUTPOST
		_roll_new_cycle_personalities()
	else:
		current_stage = STAGE_ORDER[STAGE_ORDER.find(fighting_stage) + 1]

	get_tree().change_scene_to_file(MAP_SCENE_PATH)


## Chamado por DuelScene ao perder o duelo: a run inteira se perde
## (rush/ouro/vida/baralho/melhorias resetados) e volta pro mapa do zero.
func report_defeat() -> void:
	reset_run()
	get_tree().change_scene_to_file(MAP_SCENE_PATH)


func _roll_new_cycle_personalities() -> void:
	stage_personalities.clear()
	for stage in STAGE_ORDER:
		stage_personalities[stage] = EnemyPersonality.roll_random()
