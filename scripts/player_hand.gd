## Gerencia o conjunto de cartas na mão do jogador: instanciação,
## organização espacial em leque e fila de espera (quando não há Sangue
## suficiente para jogar imediatamente).
class_name PlayerHand
extends Node3D

signal card_invoked_custom(card_node: Card3D, button_index: int)
signal card_queued(card_node: Card3D)
signal card_sacrificed(card_node: Card3D)

@export var card_scene: PackedScene
@export var card_spacing: float = 0.95

## Controla o quanto o "leque" curva as cartas nas pontas (posição Y e rotação Z).
@export var fan_curve_strength: float = 0.05
@export var fan_rotation_strength: float = 2.0
@export var reorganize_anim_time: float = 0.25

var hand_cards: Array[Card3D] = []
var queued_cards: Array[Card3D] = []


## Instancia uma nova carta e adiciona à mão.
func add_card_to_hand(card_data: CardResource) -> Card3D:
	if card_scene == null:
		push_error("PlayerHand: card_scene não foi atribuída no Inspector.")
		return null

	var new_card: Card3D = card_scene.instantiate() as Card3D
	add_child(new_card)
	new_card.card_data = card_data

	hand_cards.append(new_card)
	new_card.card_clicked.connect(_on_card_clicked)

	reorganize_hand()
	return new_card


## Reorganiza e alinha todas as cartas na mão, calculando posição e rotação
## individualmente para formar um leque.
func reorganize_hand() -> void:
	var count := hand_cards.size()
	if count == 0:
		return

	var total_width := (count - 1) * card_spacing
	var start_x := -total_width / 2.0

	for i in range(count):
		var card := hand_cards[i]
		var target_x: float = start_x + (i * card_spacing)
		var target_y: float = -absf(target_x) * fan_curve_strength
		var target_z: float = i * 0.02

		# Armazena as posições de repouso na carta para os tweens de hover/drag.
		card.base_y_position = target_y
		card.base_z_position = target_z

		var tween := create_tween().set_parallel(true)
		tween.tween_property(card, "position", Vector3(target_x, target_y, target_z), reorganize_anim_time) \
			.set_trans(Tween.TRANS_QUAD)

		# Rotação do arco aplicada apenas no eixo Z, mantendo a carta "de pé" (X = -90).
		var target_rotation := Vector3(-90.0, 0.0, -target_x * fan_rotation_strength)
		tween.tween_property(card, "rotation_degrees", target_rotation, reorganize_anim_time)


## Remove a carta da mão sem destruí-la (ex.: ao ser arrastada para o campo).
func remove_from_hand(card: Card3D) -> void:
	if card in hand_cards:
		hand_cards.erase(card)
		reorganize_hand()


func _on_card_clicked(card: Card3D, button_index: int) -> void:
	card_invoked_custom.emit(card, button_index)


## Ativa/desativa a interação de clique/drag das cartas na mão. Usado pelo
## TurnManager para só permitir jogar ou sacrificar cartas na fase de
## Invocação do jogador.
func set_interactive(enabled: bool) -> void:
	for card in hand_cards:
		card.card_area.input_ray_pickable = enabled
