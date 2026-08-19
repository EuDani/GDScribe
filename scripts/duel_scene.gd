## Controlador principal da cena de duelo: mão, campo, sangue, arraste de
## cartas, sacrifício e os modais de deck/preview.
##
## As fases de turno/combate propriamente ditas (quem pode agir agora, e
## quando) são responsabilidade do TurnManager — este script cuida só da
## "mecânica de mão" (mão do jogador, arraste, invocação, sacrifício) e é
## consultado/gated por ele via `turn_manager.is_player_summon_phase`.
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

## Máximo de cartas invocadas simultaneamente em cada campo (jogador e
## oponente). Também consultado por EnemyAiController.
@export var max_field_size: int = 5

## Duração e curva do tween que reposiciona as cartas no campo — inclui a
## "queda" da carta recém-invocada da altura da Card3D até o tabuleiro (y = 0).
@export var field_drop_anim_time: float = 0.3
@export var field_drop_trans: Tween.TransitionType = Tween.TRANS_BOUNCE
@export var field_drop_ease: Tween.EaseType = Tween.EASE_OUT

## Posição local Y do Plane dentro do blood_cup (o "nível do líquido")
## quando o barril está vazio e quando está cheio — ajuste esses dois
## valores no editor pra bater com a escala visual do modelo importado.
@export var blood_cup_empty_y: float = -0.2
@export var blood_cup_full_y: float = 0.2
#endregion

#region Referências de nós
@onready var main_camera: CameraShaker = $MainCamera
@onready var blood_manager: BloodManager = $BloodManager
@onready var player_hand: PlayerHand = $PlayerHandAnchor
@onready var player_field: Node3D = $FieldAnchors/PlayerField
@onready var blood_barrel_player: Area3D = $BloodBarrelPlayer
@onready var blood_label: Label3D = $BloodBarrelPlayer/Label3D
@onready var blood_cup_plane_player: MeshInstance3D = $BloodBarrelPlayer/blood_cup/Plane
## Área de colisão sobre a mesa: soltar uma carta arrastada aqui é o gesto
## de "jogar a carta" (ver _is_mouse_over_summon_area).
@onready var summon_area: Area3D = $SummonArea
@onready var player_deck_pile: Area3D = $PlayerDeckPile
@onready var deck_modal: DeckModal = $DeckModal

@onready var enemy_blood_manager: BloodManager = $EnemyBloodManager
@onready var blood_label_enemy: Label3D = $BloodBarrelEnemy/Label3D
@onready var blood_cup_plane_enemy: MeshInstance3D = $BloodBarrelEnemy/blood_cup/Plane
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
@onready var preview_description_label: Label = $PreviewLayer/CardUI/Descricao
@onready var preview_skill_name_label_1: Label = $PreviewLayer/CardUI/label_skill1
@onready var preview_skill_name_label_2: Label = $PreviewLayer/CardUI/label_skill2
@onready var preview_skill_name_label_3: Label = $PreviewLayer/CardUI/label_skill3
@onready var preview_skill_button_1: Button = $PreviewLayer/Skills/skill1
@onready var preview_skill_button_2: Button = $PreviewLayer/Skills/skill2
@onready var preview_skill_button_3: Button = $PreviewLayer/Skills/skill3
@onready var skill_details_label: Label = $Hud/label_skill_details
@onready var skill_details_close_button: Button = $Hud/label_skill_details/fechar_label

@onready var player_count_deck_cards_label: Label = $Hud/PlayerCountDeckCards
@onready var enemy_count_deck_cards_label: Label = $Hud/EnemyCountDeckCards

@onready var combat_manager: CombatManager = $CombatManager

@onready var message_modal: Panel = $Hud/MessageModal
@onready var message_label: Label = $Hud/MessageModal/MessageLabel
@onready var message_ok_button: Button = $Hud/MessageModal/MessageOkButton

@onready var game_over_modal: Panel = $Hud/GameOverModal
@onready var game_over_label: Label = $Hud/GameOverModal/GameOverLabel
@onready var restart_button: Button = $Hud/GameOverModal/RestartButton

@onready var end_turn_button: Button = $Hud/EndTurnButton
@onready var confirm_defense_button: Button = $Hud/ConfirmDefenseButton
#endregion

#region Estado interno
var dragged_card: Card3D = null
## Carta cujo preview está aberto no momento — usada pra saber a quais
## habilidades os botões skill1/2/3 do preview se referem.
var _preview_card_data: CardResource = null
#endregion


#region Ciclo de vida
func _ready() -> void:
	blood_manager.blood_changed.connect(_on_blood_changed.bind(blood_label, blood_cup_plane_player))
	enemy_blood_manager.blood_changed.connect(_on_blood_changed.bind(blood_label_enemy, blood_cup_plane_enemy))
	player_hand.card_invoked_custom.connect(_on_card_clicked_hand)
	combat_manager.game_over.connect(_on_game_over)

	message_ok_button.pressed.connect(hide_message)
	message_modal.visible = false

	restart_button.pressed.connect(_on_restart_button_pressed)
	game_over_modal.visible = false

	if player_deck_pile:
		player_deck_pile.input_event.connect(_on_deck_input_event)

	if preview_close_button:
		preview_close_button.pressed.connect(_hide_card_preview)

	var skill_buttons := [preview_skill_button_1, preview_skill_button_2, preview_skill_button_3]
	for i in range(skill_buttons.size()):
		skill_buttons[i].mouse_entered.connect(_on_skill_button_hovered.bind(i))
		skill_buttons[i].mouse_exited.connect(_hide_skill_details)

	if skill_details_close_button:
		skill_details_close_button.pressed.connect(_hide_skill_details)
	skill_details_label.visible = false
	preview_layer.visible = false

	if player_deck_data:
		player_deck_data.initialize_deck()
		_draw_initial_hand(inicial_hand_size)

	if enemy_deck_data:
		enemy_deck_data.initialize_deck()
		enemy_ai_controller.draw_initial_hand(enemy_deck_data, inicial_hand_size)
		enemy_hand.set_card_count(enemy_ai_controller.hand_data.size())

	update_deck_counts()


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
## Origem e direção do raio da câmera até o mouse — usado tanto pra
## projetar a carta arrastada quanto pelos raycasts de soltura/sacrifício
## abaixo, evitando recalcular a mesma projeção em cada um.
func _mouse_ray() -> Array:
	var mouse_pos := get_viewport().get_mouse_position()
	return [main_camera.project_ray_origin(mouse_pos), main_camera.project_ray_normal(mouse_pos)]


## Projeta a posição do mouse num plano paralelo à câmera para posicionar
## a carta arrastada, alinha sua orientação com a câmera, e destaca a
## carta em vermelho enquanto ela estiver sobre o barril de Sangue
## (indicando que soltá-la ali agora a sacrifica).
func _update_dragged_card_position() -> void:
	var mouse_ray := _mouse_ray()
	var ray_origin: Vector3 = mouse_ray[0]
	var ray_dir: Vector3 = mouse_ray[1]

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
## (se houver Sangue e espaço) ou devolver pra mão (se foi solta fora da
## área de invocação, se faltar Sangue, ou se o campo já está cheio).
func _drop_card(card: Card3D) -> void:
	var current_card := card
	dragged_card = null
	current_card.is_dragging = false

	if _is_mouse_over_barrel(current_card):
		_execute_sacrifice(current_card)
		return

	current_card.set_sacrifice_highlight(false)
	create_tween().tween_property(current_card, "scale", Vector3.ONE, 0.1) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)

	if _is_mouse_over_summon_area(current_card):
		if player_field.get_child_count() >= max_field_size:
			_return_card_to_hand(current_card)
			return

		var cost := current_card.card_data.blood_cost
		if blood_manager.can_afford(cost):
			blood_manager.spend_blood(cost)
			_play_card_to_field(current_card)
		else:
			_return_card_to_hand(current_card)
	else:
		_return_card_to_hand(current_card)


func _return_card_to_hand(card: Card3D) -> void:
	# Reparent primeiro, depois reseta a rotação local na mão.
	var drop_position := card.global_position
	card.reparent(player_hand)
	card.rotation_degrees = Vector3.ZERO
	# Insere na posição mais próxima de onde a carta foi solta, permitindo
	# reordenar a mão soltando uma carta arrastada entre as outras.
	player_hand.insert_card_at_position(card, drop_position)


## Layer física das CardArea de cartas já invocadas em campo (CardInvocada).
## Excluída explicitamente do raycast de soltura abaixo para que cartas
## paradas no campo, entre a câmera e a mesa, nunca atrapalhem a detecção
## de SummonArea/barril de Sangue durante o arraste de uma carta da mão.
const FIELD_CARD_COLLISION_LAYER: int = 1 << 1  # layer 2


## Faz um raycast do mouse contra o mundo e retorna true só se o collider
## mais próximo ao longo do raio for exatamente `target`, excluindo a
## própria carta arrastada da checagem de colisão. Usado tanto pra soltar
## no campo (SummonArea) quanto pra sacrificar (barril de Sangue).
func _is_mouse_over_area(target: Area3D, ignored_card: Card3D = null) -> bool:
	if not target:
		return false

	var mouse_ray := _mouse_ray()
	var ray_origin: Vector3 = mouse_ray[0]
	var ray_dir: Vector3 = mouse_ray[1]

	var space_state := get_world_3d().direct_space_state
	var query := PhysicsRayQueryParameters3D.create(ray_origin, ray_origin + (ray_dir * 1000.0))
	query.collide_with_areas = true
	query.collide_with_bodies = false

	if ignored_card:
		var card_area := ignored_card.get_node_or_null("CardArea") as Area3D
		if card_area:
			query.exclude = [card_area.get_rid()]

	query.collision_mask = target.collision_layer & ~FIELD_CARD_COLLISION_LAYER

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


## Atualiza os labels de HUD com a quantidade de cartas restantes na pilha
## de compra de cada baralho. Deve ser chamado sempre que uma carta for
## comprada (ou o baralho for inicializado).
func update_deck_counts() -> void:
	if player_count_deck_cards_label and player_deck_data:
		player_count_deck_cards_label.text = str(player_deck_data.get_remaining_cards_count())
	if enemy_count_deck_cards_label and enemy_deck_data:
		enemy_count_deck_cards_label.text = str(enemy_deck_data.get_remaining_cards_count())


func _on_card_clicked_hand(card: Card3D, button_index: int) -> void:
	if preview_layer.visible:
		_hide_card_preview()
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
	var drop_start_y := card.global_position.y
	# Posiciona a carta invocada na mesma altura da Card3D original antes de
	# reorganizar o campo, para que o tween de reorganização também sirva
	# como a animação de queda até o tabuleiro.
	spawn_field_card(card.card_data, player_field, blood_manager, drop_start_y)

	card.queue_free()
	reorganize_field(player_field, field_card_spacing)


## Escala aplicada a toda CardInvocada ao entrar em campo (maior que a
## Card3D de origem, pra destacar as cartas em jogo).
const FIELD_CARD_SCALE_MULTIPLIER: float = 1.2

## Instancia e configura uma CardInvocada em `field`: escala, dados, sinal
## de preview (clique direito) e a habilidade "saqueador" (+1 Sangue pro
## dono ao entrar em campo). Não reorganiza o campo nem anima — quem chama
## decide quando fazer isso (ver _play_card_to_field e
## EnemyAiController._summon). Compartilhado entre a invocação do jogador
## e a da IA pra não duplicar essa configuração em dois lugares.
func spawn_field_card(card_data: CardResource, field: Node3D, owner_blood_manager: BloodManager, spawn_y: float = 0.0) -> CardInvocada:
	var invoked_entity := invoked_card_scene.instantiate() as CardInvocada
	invoked_entity.scale *= FIELD_CARD_SCALE_MULTIPLIER
	field.add_child(invoked_entity)
	invoked_entity.card_data = card_data
	invoked_entity.rotation_degrees = Vector3.ZERO
	invoked_entity.global_position.y = spawn_y
	invoked_entity.card_invocada_clicked.connect(on_field_card_clicked_for_preview)

	if card_data.has_ability("saqueador"):
		owner_blood_manager.add_blood(1)

	return invoked_entity


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


## Clique numa carta já invocada (do jogador OU do oponente): botão
## direito mostra o preview de detalhes, igual às cartas da mão. Conectado
## em toda CardInvocada criada, tanto por _play_card_to_field quanto por
## EnemyAiController._summon.
func on_field_card_clicked_for_preview(card: CardInvocada, button_index: int) -> void:
	if button_index == MOUSE_BUTTON_RIGHT:
		_show_card_preview(card.card_data)
#endregion


#region Sacrifício
## Converte a carta em Sangue (ganho igual ao blood_val dela) e a remove
## da mão, com uma pequena animação de "queda no barril" antes de
## destruí-la. Chamado por _drop_card ao soltar a carta em cima do barril
## de Sangue.
func _execute_sacrifice(card: Card3D) -> void:
	var blood_gained := card.card_data.blood_val
	blood_manager.add_blood(blood_gained)

	player_hand.remove_from_hand(card)

	var tween := create_tween().set_parallel(true)
	tween.tween_property(card, "global_position", blood_barrel_player.global_position, 0.25) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	# Encolhe enquanto cai, como se afundasse no líquido do barril.
	tween.tween_property(card, "scale", Vector3.ZERO, 0.25) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.chain().tween_callback(card.queue_free)
#endregion


#region Deck e preview
func _on_deck_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if deck_modal:
			deck_modal.show_deck(player_deck_data)


## Mostra o PreviewLayer preenchido com os dados da carta clicada com o
## botão direito, reaproveitando os mesmos campos do CardUI de card.tscn,
## e sincroniza a descrição e os slots de habilidade (label + botão).
func _show_card_preview(data: CardResource) -> void:
	if not data:
		return

	preview_layer.visible = true
	_preview_card_data = data

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

	if preview_description_label:
		preview_description_label.text = data.description

	_update_skill_slots(data)


## Mostra só os slots de habilidade (nome + botão) que a carta realmente
## tem, escondendo os que sobram — ex.: carta com 1 habilidade só mostra
## skill1, skill2 e skill3 ficam ocultos.
func _update_skill_slots(data: CardResource) -> void:
	var name_labels := [preview_skill_name_label_1, preview_skill_name_label_2, preview_skill_name_label_3]
	var buttons := [preview_skill_button_1, preview_skill_button_2, preview_skill_button_3]

	for i in range(3):
		var has_ability: bool = i < data.abilities.size() and data.abilities[i] != null
		if name_labels[i]:
			name_labels[i].visible = has_ability
			if has_ability:
				name_labels[i].text = data.abilities[i].ability_name
		if buttons[i]:
			buttons[i].visible = has_ability
			if has_ability:
				buttons[i].text = data.abilities[i].icon_emoji


## Mouse por cima de um dos botões skill1/2/3 do preview: mostra o ícone,
## nome e descrição completa daquela habilidade em Hud/label_skill_details
## (ver _hide_skill_details, ligado ao mouse_exited desses mesmos botões).
func _on_skill_button_hovered(index: int) -> void:
	if not _preview_card_data or index >= _preview_card_data.abilities.size():
		return

	var ability := _preview_card_data.abilities[index]
	if not ability or not skill_details_label:
		return

	skill_details_label.text = "%s %s: %s" % [ability.icon_emoji, ability.ability_name, ability.description]
	skill_details_label.visible = true


func _hide_skill_details() -> void:
	if skill_details_label:
		skill_details_label.visible = false


## Esconde o PreviewLayer. Chamada pelo CloseButton e também ao clicar
## fora do preview (em qualquer carta da mão ou em qualquer lugar da tela).
func _hide_card_preview() -> void:
	preview_layer.visible = false
	_hide_skill_details()
#endregion


## Handler compartilhado por blood_manager e enemy_blood_manager (ver
## _ready(), onde cada um é ligado aqui com .bind() já apontando pro seu
## próprio label/copo) — evita duplicar a mesma lógica pros dois lados.
func _on_blood_changed(current: int, max_b: int, label: Label3D, cup_plane: MeshInstance3D) -> void:
	label.text = "%d / %d" % [current, max_b]
	_update_blood_cup(cup_plane, current, max_b)


## Move o Plane do blood_cup no eixo Y proporcionalmente ao Sangue atual,
## simulando o nível do líquido subindo/descendo dentro do copo. Com 0 de
## Sangue o Plane some por completo (nada de líquido pra mostrar).
func _update_blood_cup(plane: MeshInstance3D, current: int, max_b: int) -> void:
	if not plane or max_b <= 0:
		return

	plane.visible = current > 0
	if current <= 0:
		return

	var fraction := clampf(float(current) / float(max_b), 0.0, 1.0)
	var local_pos := plane.position
	local_pos.y = lerpf(blood_cup_empty_y, blood_cup_full_y, fraction)
	plane.position = local_pos


#region Modais de HUD (aviso e fim de jogo)
## Mostra o MessageModal com `text` — usado pelo TurnManager para avisar o
## jogador de ações inválidas (ex.: confirmar defesa com uma bloqueadora
## selecionada mas ainda não associada a um atacante).
func show_message(text: String) -> void:
	message_label.text = text
	message_modal.visible = true


func hide_message() -> void:
	message_modal.visible = false


## Fim de jogo: mostra o resultado, esconde os controles de turno e trava a
## mão do jogador — só resta reiniciar.
func _on_game_over(player_won: bool) -> void:
	game_over_label.text = "Vitória!" if player_won else "Derrota!"
	game_over_modal.visible = true

	end_turn_button.visible = false
	confirm_defense_button.visible = false
	player_hand.set_interactive(false)


func _on_restart_button_pressed() -> void:
	get_tree().reload_current_scene()
#endregion
