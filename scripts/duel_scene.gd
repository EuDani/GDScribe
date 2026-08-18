## Controlador principal da cena de duelo: mão, campo, sangue, arraste de
## cartas, fila de espera, sacrifício e os modais de deck/preview.
##
## As fases de turno/combate propriamente ditas (quem pode agir agora, e
## quando) são responsabilidade do TurnManager — este script cuida só da
## "mecânica de mão" (mão do jogador, arraste, invocação, fila de Sangue,
## sacrifício) e é consultado/gated por ele via `turn_manager.is_player_summon_phase`.
class_name DuelScene
extends Node3D

#region Configuração exportada
@export var player_deck_data: DeckResource
@export var enemy_deck_data: DeckResource
@export var inicial_hand_size: int = 4
@export var invoked_card_scene: PackedScene = preload("res://scenes/card_invocada.tscn")

## Distância (em unidades 3D) à frente da câmera onde a carta flutua durante o drag.
@export var drag_distance_from_camera: float = 3.0
@export var field_card_spacing: float = 2.0
@export var queue_anim_time: float = 0.25
@export var queue_scale: float = 0.8

## Máximo de cartas invocadas simultaneamente em cada campo (jogador e
## oponente). Também consultado por EnemyAiController.
@export var max_field_size: int = 5

## Duração e curva do tween que reposiciona as cartas no campo — inclui a
## "queda" da carta recém-invocada da altura da Card3D até o tabuleiro (y = 0).
@export var field_drop_anim_time: float = 0.3
@export var field_drop_trans: Tween.TransitionType = Tween.TRANS_BOUNCE
@export var field_drop_ease: Tween.EaseType = Tween.EASE_OUT
#endregion

#region Referências de nós
@onready var main_camera: Camera3D = $MainCamera
@onready var blood_manager: BloodManager = $BloodManager
@onready var player_hand: PlayerHand = $PlayerHandAnchor
@onready var player_field: Node3D = $FieldAnchors/PlayerField
@onready var queue_anchor: Node3D = $QueueAnchor
@onready var blood_barrel_player: Area3D = $BloodBarrelPlayer
@onready var blood_label: Label3D = $BloodBarrelPlayer/Label3D
## Área de colisão sobre a mesa: soltar uma carta arrastada aqui é o gesto
## de "jogar a carta" (ver _is_mouse_over_summon_area).
@onready var summon_area: Area3D = $SummonArea
@onready var player_deck_pile: Area3D = $PlayerDeckPile
@onready var deck_modal: DeckModal = $DeckModal

@onready var enemy_blood_manager: BloodManager = $EnemyBloodManager
@onready var blood_label_enemy: Label3D = $BloodBarrelEnemy/Label3D
@onready var enemy_field: Node3D = $FieldAnchors/EnemyField
@onready var enemy_hand: EnemyHand = $EnemyHandAnchor
@onready var enemy_ai_controller: EnemyAiController = $EnemyAiController
@onready var turn_manager: TurnManager = $TurnManager

@onready var preview_layer: CanvasLayer = $PreviewLayer
@onready var preview_card_ui: Control = $PreviewLayer/CardUI
@onready var preview_name_label: Label = $PreviewLayer/CardUI/NameLabel
@onready var preview_artwork_rect: TextureRect = $PreviewLayer/CardUI/Artwork
@onready var preview_blood_cost_label: Label = $PreviewLayer/CardUI/HeaderPanel/BloodCostLabel
@onready var preview_attack_label: Label = $PreviewLayer/CardUI/FooterPanel/AttackLabel
@onready var preview_defense_label: Label = $PreviewLayer/CardUI/FooterPanel/DefenseLabel
@onready var preview_close_button: Button = $PreviewLayer/CardUI/CloseButton
#endregion

#region Estado interno
var dragged_card: Card3D = null
#endregion


#region Ciclo de vida
func _ready() -> void:
	blood_manager.blood_changed.connect(_on_blood_changed)
	enemy_blood_manager.blood_changed.connect(_on_enemy_blood_changed)
	player_hand.card_invoked_custom.connect(_on_card_clicked_hand)

	if player_deck_pile:
		player_deck_pile.input_event.connect(_on_deck_input_event)

	if preview_close_button:
		preview_close_button.pressed.connect(_hide_card_preview)
	preview_layer.visible = false

	if player_deck_data:
		player_deck_data.initialize_deck()
		_draw_initial_hand(inicial_hand_size)

	if enemy_deck_data:
		enemy_deck_data.initialize_deck()
		enemy_ai_controller.draw_initial_hand(enemy_deck_data, inicial_hand_size)
		enemy_hand.set_card_count(enemy_ai_controller.hand_data.size())


func _process(_delta: float) -> void:
	if not dragged_card:
		return
	_update_dragged_card_position()


func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.is_echo():
		if event.keycode == KEY_R:
			get_tree().reload_current_scene()
			return

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and not event.pressed and dragged_card:
			_drop_card(dragged_card)
		elif event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if preview_layer.visible:
				_hide_card_preview()
#endregion


#region Arraste de carta
## Projeta a posição do mouse num plano paralelo à câmera para posicionar
## a carta arrastada, alinha sua orientação com a câmera, e destaca a
## carta em vermelho enquanto ela estiver sobre o barril de Sangue
## (indicando que soltá-la ali agora a sacrifica).
func _update_dragged_card_position() -> void:
	var mouse_pos := get_viewport().get_mouse_position()
	var ray_origin := main_camera.project_ray_origin(mouse_pos)
	var ray_dir := main_camera.project_ray_normal(mouse_pos)

	var cam_forward := -main_camera.global_transform.basis.z.normalized()
	var plane_point := main_camera.global_position + (cam_forward * drag_distance_from_camera)
	var drag_plane := Plane(cam_forward, plane_point)

	var intersection = drag_plane.intersects_ray(ray_origin, ray_dir)
	if intersection:
		dragged_card.global_position = intersection

	dragged_card.global_transform.basis = main_camera.global_transform.basis

	dragged_card.set_sacrifice_highlight(_is_mouse_over_barrel(dragged_card))


## Ao soltar o botão do mouse com uma carta em arraste: sacrifica se foi
## solta em cima do barril de Sangue; senão decide entre jogar no campo
## (se houver Sangue e espaço), enfileirar (se faltar só Sangue) ou
## devolver pra mão (se foi solta fora da área de invocação, ou se o
## campo já está cheio).
func _drop_card(card: Card3D) -> void:
	var current_card := card
	dragged_card = null
	current_card.is_dragging = false

	if _is_mouse_over_barrel(current_card):
		_execute_sacrifice(current_card)
		return

	current_card.set_sacrifice_highlight(false)
	create_tween().tween_property(current_card, "scale", Vector3.ONE, 0.1)

	if _is_mouse_over_summon_area(current_card):
		if player_field.get_child_count() >= max_field_size:
			_return_card_to_hand(current_card)
			return

		var cost := current_card.card_data.blood_cost
		if blood_manager.can_afford(cost):
			blood_manager.spend_blood(cost)
			_play_card_to_field(current_card)
		else:
			_queue_card(current_card)
	else:
		_return_card_to_hand(current_card)


func _return_card_to_hand(card: Card3D) -> void:
	# Reparent primeiro, depois reseta a rotação local na mão.
	card.reparent(player_hand)
	card.rotation_degrees = Vector3.ZERO
	player_hand.hand_cards.append(card)
	player_hand.reorganize_hand()


## Faz um raycast do mouse contra o mundo e retorna true só se o collider
## mais próximo ao longo do raio for exatamente `target`, excluindo a
## própria carta arrastada da checagem de colisão. Usado tanto pra soltar
## no campo (SummonArea) quanto pra sacrificar (barril de Sangue).
func _is_mouse_over_area(target: Area3D, ignored_card: Card3D = null) -> bool:
	if not target:
		return false

	var mouse_pos := get_viewport().get_mouse_position()
	var ray_origin := main_camera.project_ray_origin(mouse_pos)
	var ray_dir := main_camera.project_ray_normal(mouse_pos)

	var space_state := get_world_3d().direct_space_state
	var query := PhysicsRayQueryParameters3D.create(ray_origin, ray_origin + (ray_dir * 1000.0))
	query.collide_with_areas = true
	query.collide_with_bodies = false

	if ignored_card:
		var card_area := ignored_card.get_node_or_null("CardArea") as Area3D
		if card_area:
			query.exclude = [card_area.get_rid()]

	query.collision_mask = target.collision_layer

	var result := space_state.intersect_ray(query)
	return result.has("collider") and result.collider == target


func _is_mouse_over_summon_area(ignored_card: Card3D = null) -> bool:
	return _is_mouse_over_area(summon_area, ignored_card)


func _is_mouse_over_barrel(ignored_card: Card3D = null) -> bool:
	return _is_mouse_over_area(blood_barrel_player, ignored_card)
#endregion


#region Mão e campo
## Compra `amount` cartas do baralho do jogador direto pra mão — usado só
## na montagem inicial da partida (ver _ready()).
func _draw_initial_hand(amount: int) -> void:
	for i in range(amount):
		var card_data := player_deck_data.draw_card()
		if card_data:
			player_hand.add_card_to_hand(card_data)


func _on_card_clicked_hand(card: Card3D, button_index: int) -> void:
	if preview_layer.visible:
		_hide_card_preview()
		return

	if button_index == MOUSE_BUTTON_RIGHT and not player_hand.queued_cards.is_empty():
		_clear_queue_to_hand()
		return

	if button_index == MOUSE_BUTTON_LEFT:
		dragged_card = card
		card.start_drag()
		player_hand.remove_from_hand(card)
		card.reparent(self)
	elif button_index == MOUSE_BUTTON_RIGHT:
		_show_card_preview(card.card_data)


## Instancia a CardInvocada no campo, partindo da altura em que a Card3D
## estava ao ser solta, e deixa reorganize_field animar a "queda" até o
## tabuleiro (y = 0) junto com o reposicionamento em X.
func _play_card_to_field(card: Card3D) -> void:
	var card_data := card.card_data
	var drop_start_y := card.global_position.y

	var invoked_entity := invoked_card_scene.instantiate() as CardInvocada
	invoked_entity.scale *= 1.2
	player_field.add_child(invoked_entity)
	invoked_entity.card_data = card_data
	invoked_entity.rotation_degrees = Vector3.ZERO

	# Posiciona a carta invocada na mesma altura da Card3D original antes de
	# reorganizar o campo, para que o tween de reorganização também sirva
	# como a animação de queda até o tabuleiro.
	invoked_entity.global_position.y = drop_start_y

	card.queue_free()
	reorganize_field(player_field, field_card_spacing)


## Pública: também usada por CombatManager (após morte em combate) e por
## EnemyAiController (após invocar uma carta no campo do oponente).
func reorganize_field(field_node: Node3D, spacing: float = 1.5) -> void:
	var entities := field_node.get_children()
	var count := entities.size()
	if count == 0:
		return

	var total_width := (count - 1) * spacing
	var start_x := -total_width / 2.0

	for i in range(count):
		var target_x := start_x + (i * spacing)
		var target_position := Vector3(target_x, 0.0, 0.0)
		create_tween().tween_property(entities[i], "position", target_position, field_drop_anim_time) \
			.set_trans(field_drop_trans).set_ease(field_drop_ease)
#endregion


#region Fila de espera (cartas sem Sangue suficiente)
## Envia a carta pra fila de espera (visível ao lado do campo) até haver
## Sangue suficiente pra pagá-la. Só existe uma carta na fila por vez: uma
## nova tentativa de enfileirar substitui a anterior (que volta pra mão).
func _queue_card(card: Card3D) -> void:
	if not player_hand.queued_cards.is_empty():
		_clear_queue_to_hand()

	player_hand.queued_cards.append(card)
	card.reparent(queue_anchor)

	var tween := create_tween().set_parallel(true)
	tween.tween_property(card, "position", Vector3.ZERO, queue_anim_time)
	tween.tween_property(card, "scale", Vector3.ONE * queue_scale, queue_anim_time)


## Devolve todas as cartas da fila de volta pra mão (ex.: clique direito
## numa carta da mão enquanto há algo na fila).
func _clear_queue_to_hand() -> void:
	while not player_hand.queued_cards.is_empty():
		var q_card: Card3D = player_hand.queued_cards.pop_front()
		q_card.reparent(player_hand)
		player_hand.hand_cards.append(q_card)
		create_tween().tween_property(q_card, "scale", Vector3.ONE, 0.2)
	player_hand.reorganize_hand()


## Chamado sempre que o Sangue muda: joga automaticamente a primeira carta
## da fila assim que houver Sangue suficiente para ela e o campo não
## estiver cheio (senão ela continua esperando na fila).
func _check_queued_cards() -> void:
	if player_hand.queued_cards.is_empty():
		return
	if player_field.get_child_count() >= max_field_size:
		return

	var first_queued: Card3D = player_hand.queued_cards[0]
	if blood_manager.can_afford(first_queued.card_data.blood_cost):
		player_hand.queued_cards.remove_at(0)
		blood_manager.spend_blood(first_queued.card_data.blood_cost)
		_play_card_to_field(first_queued)
#endregion


#region Sacrifício
## Converte a carta em Sangue (ganho igual à Defesa dela) e a remove da
## mão, com uma pequena animação de "queda no barril" antes de destruí-la.
## Chamado por _drop_card ao soltar a carta em cima do barril de Sangue.
func _execute_sacrifice(card: Card3D) -> void:
	var defense_gained := card.card_data.defense
	blood_manager.add_blood(defense_gained)

	player_hand.remove_from_hand(card)

	var tween := create_tween()
	tween.tween_property(card, "global_position", blood_barrel_player.global_position, 0.25)
	tween.tween_callback(card.queue_free)
#endregion


#region Deck e preview
func _on_deck_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if deck_modal:
			deck_modal.show_deck(player_deck_data)


## Mostra o PreviewLayer preenchido com os dados da carta clicada com o
## botão direito, reaproveitando os mesmos campos do CardUI de card.tscn.
func _show_card_preview(data: CardResource) -> void:
	if not data:
		return

	preview_layer.visible = true

	preview_name_label.text = data.card_name
	preview_blood_cost_label.text = str(data.blood_cost)

	# Cartas de Efeito são resolvidas na hora e não têm ATK/DEF relevantes.
	var is_effect := data.is_effect
	preview_attack_label.visible = not is_effect
	preview_defense_label.visible = not is_effect
	preview_attack_label.text = str(data.attack)
	preview_defense_label.text = str(data.defense)

	if preview_artwork_rect and data.artwork:
		preview_artwork_rect.texture = data.artwork


## Esconde o PreviewLayer. Chamada pelo CloseButton e também ao clicar
## fora do preview (em qualquer carta da mão ou em qualquer lugar da tela).
func _hide_card_preview() -> void:
	preview_layer.visible = false
#endregion


func _on_blood_changed(current: int, max_b: int) -> void:
	blood_label.text = "%d / %d" % [current, max_b]
	_check_queued_cards()


func _on_enemy_blood_changed(current: int, max_b: int) -> void:
	blood_label_enemy.text = "%d / %d" % [current, max_b]
