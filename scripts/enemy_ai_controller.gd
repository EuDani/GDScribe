## Cérebro do oponente: guarda a mão dele como dados e decide invocação,
## ataque e bloqueio.
class_name EnemyAiController
extends Node

@export var action_delay: float = 0.5
@export var max_summons_per_turn: int = 2

## Sorteada por DuelScene._ready() antes do baralho ser montado. Define o
## viés do baralho (ver DuelScene._ready()) e é consultada por quase todo
## método deste script pra ajustar invocação, ataque e bloqueio.
var personality: EnemyPersonality

var hand_data: Array[CardResource] = []
var deck: DeckResource

## --- Estado usado pelas personalidades reativas (ver TurnManager, que
## atualiza estes campos ao fim de cada turno do jogador) ---
## Oportunista: o jogador invocou alguma carta no turno anterior?
var player_summoned_last_turn: bool = false
## Espelho: quantas cartas o jogador mandou atacar no turno anterior.
var player_attacker_count_last_turn: int = 0

@onready var duel_scene: DuelScene = $".."
@onready var enemy_field: Node3D = $"../FieldAnchors/EnemyField"
@onready var enemy_hand: EnemyHand = $"../EnemyHandAnchor"
@onready var enemy_blood_manager: BloodManager = $"../EnemyBloodManager"


## Compra a mão inicial do baralho do oponente.
func draw_initial_hand(deck_data: DeckResource, amount: int) -> void:
	deck = deck_data
	for i in range(amount):
		_draw_card()
	_refresh_hand_visual()


## Compra cartas até a mão do oponente atingir `target_size` — mesma regra
## de "completar até o teto" do jogador (ver
## TurnManager._draw_card_for_turn), chamada no início do turno de
## invocação do oponente.
func draw_up_to_hand_size(target_size: int) -> void:
	var missing := target_size - hand_data.size()
	for i in range(missing):
		_draw_card()
	_refresh_hand_visual()


## Fila modular de ações do turno de invocação: cura (Tartaruga), tenta uma
## invocação grátis (Trapaceiro), depois invoca normalmente até o teto de
## summons do turno — se não conseguir pagar nada da mão, sacrifica a
## carta mais barata em troca de Sangue e tenta de novo antes de desistir.
func run_invocation_phase() -> void:
	_apply_turtle_heal()

	if not hand_data.is_empty() and personality and randf() < personality.free_summon_chance():
		var free_card: CardResource = hand_data[randi() % hand_data.size()]
		hand_data.erase(free_card)
		_refresh_hand_visual()
		await _summon(free_card, true)
		await get_tree().create_timer(action_delay).timeout

	var summon_limit := _effective_max_summons()
	var summons := 0
	while summons < summon_limit and enemy_field.get_child_count() < duel_scene.max_field_size:
		var card_data := _pick_affordable_card()

		if not card_data and hand_data.size() > 1:
			if not _sacrifice_cheapest_card():
				break
			await get_tree().create_timer(action_delay).timeout
			card_data = _pick_affordable_card()

		if not card_data:
			break

		hand_data.erase(card_data)
		_refresh_hand_visual()
		await _summon(card_data)

		summons += 1
		await get_tree().create_timer(action_delay).timeout


## Colecionador guarda cartas (no máx. 1 invocação por turno) até acumular
## pelo menos 3 categorias distintas na mão — aí solta tudo de uma vez
## (usa o teto normal de summons do turno).
func _effective_max_summons() -> int:
	if not personality or personality.type != EnemyPersonality.Type.COLECIONADOR:
		return max_summons_per_turn

	var distinct_categories: Dictionary = {}
	for card_data in hand_data:
		distinct_categories[card_data.category] = true

	return max_summons_per_turn if distinct_categories.size() >= 3 else 1


## Tartaruga recupera 1 de Defesa (até o valor impresso) em cada carta do
## campo no início do próprio turno — o motivo dela ficar "difícil de
## derrubar" no late game.
func _apply_turtle_heal() -> void:
	if not personality or personality.type != EnemyPersonality.Type.TARTARUGA:
		return

	for child in enemy_field.get_children():
		if child is CardInvocada and child.card_data:
			child.current_defense = mini(child.current_defense + 1, child.card_data.defense)
			child.refresh_stat_labels()


## Sacrifica a carta de menor custo da mão em troca de Sangue (blood_val
## dela), pra tentar destravar uma invocação que não cabia no Sangue
## disponível. Nunca esvazia a mão por completo (chamado só quando há
## mais de 1 carta — ver run_invocation_phase).
func _sacrifice_cheapest_card() -> bool:
	if hand_data.is_empty():
		return false

	var cheapest: CardResource = hand_data[0]
	for card_data in hand_data:
		if card_data.blood_cost < cheapest.blood_cost:
			cheapest = card_data

	hand_data.erase(cheapest)

	# Tira 1 sprite da mão antes de recalcular a contagem, pra poder animar
	# ele voando até o barril de Sangue do oponente (espelha
	# DuelScene._execute_sacrifice, usada pro jogador) em vez de só sumir.
	var sprite := enemy_hand.pop_sprite()
	_refresh_hand_visual()
	enemy_blood_manager.add_blood(cheapest.blood_val)

	if sprite:
		_animate_sacrifice(sprite)

	return true


## Anima o sprite de costas da carta sacrificada caindo no barril de
## Sangue do oponente antes de sumir.
func _animate_sacrifice(sprite: Sprite3D) -> void:
	var target_position: Vector3 = duel_scene.blood_barrel_enemy.global_position if duel_scene.blood_barrel_enemy else sprite.global_position

	var tween := sprite.create_tween().set_parallel(true)
	tween.tween_property(sprite, "global_position", target_position, 0.25) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	# Encolhe enquanto cai, como se afundasse no líquido do barril — igual
	# ao sacrifício do jogador.
	tween.tween_property(sprite, "scale", Vector3.ZERO, 0.25) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.chain().tween_callback(sprite.queue_free)


## Escolhe quais cartas do campo do oponente atacam neste turno. A fração
## de atacantes elegíveis que realmente ataca depende da personalidade
## (ver _compute_attack_share) — Agressivo ataca com tudo, Defensivo/
## Paciente/Tartaruga seguram a maioria, Caótico/Espelho/Desesperado/
## Vingativo variam conforme o estado atual da partida.
func decide_attackers() -> Array[CardInvocada]:
	var eligible: Array[CardInvocada] = []
	for child in enemy_field.get_children():
		if child is CardInvocada and child.can_attack():
			eligible.append(child)

	var share := _compute_attack_share()
	if share >= 1.0 or eligible.is_empty():
		return eligible

	eligible.shuffle()
	var count: int = roundi(eligible.size() * share) if share > 0.0 else 0
	return eligible.slice(0, count)


func _compute_attack_share() -> float:
	if not personality:
		return 1.0

	match personality.type:
		EnemyPersonality.Type.CAOTICO:
			return randf_range(0.2, 1.0)
		EnemyPersonality.Type.ESPELHO:
			# Espelha a proporção de atacantes que o jogador mandou no
			# último turno dele, em cima do tamanho do campo dele agora.
			var player_field_size: int = duel_scene.player_field.get_child_count()
			if player_field_size <= 0:
				return personality.base_attack_share()
			return clampf(float(player_attacker_count_last_turn) / float(player_field_size), 0.1, 1.0)
		EnemyPersonality.Type.DESESPERADO:
			var combat_manager: CombatManager = duel_scene.combat_manager
			var hp_ratio := float(combat_manager.enemy_hp) / float(maxi(combat_manager.starting_hp, 1))
			return 1.0 if hp_ratio <= 0.5 else personality.base_attack_share()
		EnemyPersonality.Type.VINGATIVO:
			var combat_manager: CombatManager = duel_scene.combat_manager
			var vengeance := combat_manager.last_enemy_hp_lost - combat_manager.last_player_hp_lost_by_enemy
			return clampf(personality.base_attack_share() + float(vengeance) * 0.1, 0.1, 1.0)
		_:
			return personality.base_attack_share()


## Decide quais cartas do oponente bloqueiam quais atacantes do jogador.
## Por padrão só bloqueia quando sobrevive ao bloqueio (DEF+Escudo >= ATK
## do atacante); senão prefere levar o dano a perder uma carta à toa —
## exceto personalidades "sempre tenta bloquear" (Paranoico, Defensivo,
## Tartaruga), que arriscam a bloqueadora mesmo sem essa garantia. Atacantes
## com "Voar" só podem ser bloqueados por candidatas com "Voar" ou
## "Alcance". Predador ordena os atacantes do mais forte pro mais fraco
## primeiro (quer neutralizar a maior ameaça do campo do jogador antes de
## sobrar bloqueadora pras outras) e arrisca a troca sempre que consegue
## matar o atacante de volta. Cada atacante recebe no máximo 1 bloqueadora
## aqui — a IA não monta bloqueio em grupo por enquanto, mesmo que o motor
## de combate já suporte isso para o jogador.
func decide_blocks(attackers: Array[CardInvocada]) -> Dictionary:
	var blocks: Dictionary = {}
	var available: Array[CardInvocada] = []
	for child in enemy_field.get_children():
		if child is CardInvocada and child.can_block():
			available.append(child)

	var is_predador := personality != null and personality.type == EnemyPersonality.Type.PREDADOR
	var ordered_attackers := attackers.duplicate()
	if is_predador:
		ordered_attackers.sort_custom(
			func(a: CardInvocada, b: CardInvocada) -> bool:
				return (a.card_data.attack + a.card_data.defense) > (b.card_data.attack + b.card_data.defense)
		)

	var always_block := personality != null and personality.always_tries_to_block()

	for attacker: CardInvocada in ordered_attackers:
		var flying := attacker.has_ability("voar")
		var safe_blocker: CardInvocada = null
		var risky_blocker: CardInvocada = null
		for candidate in available:
			if flying and not (candidate.has_ability("voar") or candidate.has_ability("alcance")):
				continue
			# current_shield conta como "Defesa extra" pra fins de segurança:
			# se o Escudo sozinho já absorve o golpe, a Defesa nem é tocada.
			var effective_toughness: int = candidate.current_defense + candidate.current_shield
			if effective_toughness >= attacker.card_data.attack:
				if safe_blocker == null or candidate.current_defense < safe_blocker.current_defense:
					safe_blocker = candidate
			elif risky_blocker == null or candidate.card_data.attack > risky_blocker.card_data.attack:
				risky_blocker = candidate

		var chosen: CardInvocada = safe_blocker
		if not chosen and risky_blocker:
			var takes_the_risk := always_block
			if is_predador:
				# Predador só arrisca se a troca mata o atacante de volta —
				# quer eliminar a ameaça, não só se sacrificar por ela.
				takes_the_risk = risky_blocker.card_data.attack >= attacker.current_defense + attacker.current_shield
			if takes_the_risk:
				chosen = risky_blocker

		if chosen:
			blocks[attacker] = [chosen]
			available.erase(chosen)
		else:
			blocks[attacker] = []

	return blocks


func _draw_card() -> void:
	if not deck:
		return
	var card_data := deck.draw_card()
	if card_data:
		hand_data.append(card_data)
	duel_scene.update_deck_counts()


func _refresh_hand_visual() -> void:
	if enemy_hand:
		enemy_hand.set_card_count(hand_data.size())


## Ambicioso guarda uma reserva de Sangue em vez de gastar tudo que pode —
## quer *ter* Sangue, não só gastá-lo assim que possível.
const AMBICIOSO_BLOOD_RESERVE: int = 2


func _pick_affordable_card() -> CardResource:
	var reserve := AMBICIOSO_BLOOD_RESERVE if (personality and personality.type == EnemyPersonality.Type.AMBICIOSO) else 0
	var usable_blood := enemy_blood_manager.current_blood - reserve

	var best: CardResource = null
	for card_data in hand_data:
		if card_data.blood_cost <= usable_blood and (best == null or card_data.blood_cost > best.blood_cost):
			best = card_data
	return best


## `free`, usado pela invocação-de-graça do Trapaceiro (ver
## run_invocation_phase), pula o gasto de Sangue por completo.
func _summon(card_data: CardResource, free: bool = false) -> void:
	if not free:
		enemy_blood_manager.spend_blood(card_data.blood_cost)

	duel_scene.spawn_field_card(card_data, enemy_field, enemy_blood_manager, 3.0)

	duel_scene.reorganize_field(enemy_field, duel_scene.field_card_spacing)
	await get_tree().create_timer(duel_scene.field_drop_anim_time).timeout
