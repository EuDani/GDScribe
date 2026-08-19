## Cérebro do oponente: guarda a mão dele como dados e decide invocação,
## ataque e bloqueio.
class_name EnemyAiController
extends Node

@export var action_delay: float = 0.5
@export var max_summons_per_turn: int = 2

var hand_data: Array[CardResource] = []
var deck: DeckResource

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


## Fila modular de ações do turno de invocação: tenta invocar; se não
## conseguir pagar nada da mão, sacrifica a carta mais barata em troca de
## Sangue e tenta de novo antes de desistir.
func run_invocation_phase() -> void:
	var summons := 0
	while summons < max_summons_per_turn and enemy_field.get_child_count() < duel_scene.max_field_size:
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
	_refresh_hand_visual()
	enemy_blood_manager.add_blood(cheapest.blood_val)
	return true


## Escolhe quais cartas do campo do oponente atacam neste turno. Como o
## atacante nunca morre num bloqueio, a IA ataca com tudo que puder.
func decide_attackers() -> Array[CardInvocada]:
	var attackers: Array[CardInvocada] = []
	for child in enemy_field.get_children():
		if child is CardInvocada and child.can_attack():
			attackers.append(child)
	return attackers


## Decide quais cartas do oponente bloqueiam quais atacantes do jogador. Só
## bloqueia quando sobrevive ao bloqueio (DEF >= ATK do atacante); senão
## prefere levar o dano a perder uma carta à toa. Atacantes com "Voar" só
## podem ser bloqueados por candidatas com "Voar" ou "Alcance". Cada
## atacante recebe no máximo 1 bloqueadora aqui — a IA não monta bloqueio
## em grupo por enquanto, mesmo que o motor de combate já suporte isso
## para o jogador.
func decide_blocks(attackers: Array[CardInvocada]) -> Dictionary:
	var blocks: Dictionary = {}
	var available: Array[CardInvocada] = []
	for child in enemy_field.get_children():
		if child is CardInvocada and child.can_block():
			available.append(child)

	for attacker in attackers:
		var flying := attacker.has_ability("voar")
		var safe_blocker: CardInvocada = null
		for candidate in available:
			if flying and not (candidate.has_ability("voar") or candidate.has_ability("alcance")):
				continue
			# current_shield conta como "Defesa extra" pra fins de segurança:
			# se o Escudo sozinho já absorve o golpe, a Defesa nem é tocada.
			var effective_toughness: int = candidate.current_defense + candidate.current_shield
			if effective_toughness >= attacker.card_data.attack:
				if safe_blocker == null or candidate.current_defense < safe_blocker.current_defense:
					safe_blocker = candidate

		if safe_blocker:
			blocks[attacker] = [safe_blocker]
			available.erase(safe_blocker)
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


func _pick_affordable_card() -> CardResource:
	var best: CardResource = null
	for card_data in hand_data:
		if enemy_blood_manager.can_afford(card_data.blood_cost) and (best == null or card_data.blood_cost > best.blood_cost):
			best = card_data
	return best


func _summon(card_data: CardResource) -> void:
	enemy_blood_manager.spend_blood(card_data.blood_cost)

	duel_scene.spawn_field_card(card_data, enemy_field, enemy_blood_manager, 3.0)

	duel_scene.reorganize_field(enemy_field, duel_scene.field_card_spacing)
	await get_tree().create_timer(duel_scene.field_drop_anim_time).timeout
