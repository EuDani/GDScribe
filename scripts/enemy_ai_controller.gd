## Cérebro do oponente: guarda a mão dele como dados e decide invocação,
## ataque e bloqueio.
class_name EnemyAiController
extends Node

@export var invoked_card_scene: PackedScene = preload("res://scenes/card_invocada.tscn")
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


## Fila modular de ações do turno de invocação: por enquanto só invoca
## cartas; puxar carta, sacrificar e usar habilidade entram como próximas
## ações dessa mesma fila.
func run_invocation_phase() -> void:
	var summons := 0
	while summons < max_summons_per_turn:
		var card_data := _pick_affordable_card()
		if not card_data:
			break

		hand_data.erase(card_data)
		_refresh_hand_visual()
		await _summon(card_data)

		summons += 1
		await get_tree().create_timer(action_delay).timeout


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
## prefere levar o dano a perder uma carta à toa.
func decide_blocks(attackers: Array[CardInvocada]) -> Dictionary:
	var blocks: Dictionary = {}
	var available: Array[CardInvocada] = []
	for child in enemy_field.get_children():
		if child is CardInvocada and child.can_block():
			available.append(child)

	for attacker in attackers:
		var safe_blocker: CardInvocada = null
		for candidate in available:
			if candidate.card_data.defense >= attacker.card_data.attack:
				if safe_blocker == null or candidate.card_data.defense < safe_blocker.card_data.defense:
					safe_blocker = candidate

		if safe_blocker:
			blocks[attacker] = safe_blocker
			available.erase(safe_blocker)
		else:
			blocks[attacker] = null

	return blocks


func _draw_card() -> void:
	if not deck:
		return
	var card_data := deck.draw_card()
	if card_data:
		hand_data.append(card_data)


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

	var invoked_entity := invoked_card_scene.instantiate() as CardInvocada
	invoked_entity.scale *= 1.2
	enemy_field.add_child(invoked_entity)
	invoked_entity.card_data = card_data
	invoked_entity.rotation_degrees = Vector3.ZERO
	invoked_entity.global_position.y = 3.0

	duel_scene.reorganize_field(enemy_field, duel_scene.field_card_spacing)
	await get_tree().create_timer(duel_scene.field_drop_anim_time).timeout
