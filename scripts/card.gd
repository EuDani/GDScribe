## Representa uma carta interativa na mão do jogador (arrastável, com hover
## e suporte a sacrifício por "segurar clique").
class_name Card3D
extends CardVisualBase

signal card_clicked(card_node: Card3D, button_index: int)
signal card_held_started(card_node: Card3D)
signal card_held_released(card_node: Card3D)

@onready var progress_bar: ProgressBar = $CardViewport/CardUI/HeaderPanel/SacrificeProgress

# --- Parâmetros de animação ---
const HOVER_ANIM_TIME: float = 0.15
const HOVER_Z_OFFSET: float = 0.85
const HOVER_SCALE: float = 1.1
const DRAG_SCALE: float = 1.3
const DRAG_ANIM_TIME: float = 0.15

# --- Sacrifício (segurar o clique) ---
const SACRIFICE_HOLD_TIME: float = 1.0

var is_hovered: bool = false
var is_dragging: bool = false
var base_y_position: float = 0.0
var base_z_position: float = 0.0
var tween: Tween

var is_holding: bool = false
var hold_timer: float = 0.0


func _ready() -> void:
	super._ready()
	card_area.mouse_entered.connect(_on_mouse_entered)
	card_area.mouse_exited.connect(_on_mouse_exited)
	card_area.input_event.connect(_on_input_event)

	if progress_bar:
		progress_bar.visible = false
		progress_bar.value = 0


func _process(delta: float) -> void:
	if not is_holding:
		return

	hold_timer += delta
	if progress_bar:
		progress_bar.value = (hold_timer / SACRIFICE_HOLD_TIME) * 100.0

	if hold_timer >= SACRIFICE_HOLD_TIME:
		is_holding = false
		card_held_released.emit(self)
		cancel_hold()


## Preenche os textos básicos (via CardVisualBase) e aplica regras próprias
## da mão: cartas de tática não exibem ATK/DEF.
func update_visuals() -> void:
	super.update_visuals()
	if not card_data:
		return

	var is_tactic := card_data.is_tactic
	attack_label.visible = not is_tactic
	defense_label.visible = not is_tactic


## Inicia o arraste: cancela hover/tweens ativos e aplica zoom de "pegar".
func start_drag() -> void:
	is_dragging = true
	is_hovered = false
	_kill_active_tween()

	tween = create_tween().set_parallel(true)
	tween.tween_property(self, "scale", Vector3.ONE * DRAG_SCALE, DRAG_ANIM_TIME) \
		.set_trans(Tween.TRANS_QUAD)


func start_hold_sacrifice() -> void:
	is_holding = true
	hold_timer = 0.0
	if progress_bar:
		progress_bar.visible = true
		progress_bar.value = 0


func cancel_hold() -> void:
	is_holding = false
	hold_timer = 0.0
	if progress_bar:
		progress_bar.visible = false
		progress_bar.value = 0


## Hover: aproxima a carta da câmera no eixo Z, sem alterar Y.
func _on_mouse_entered() -> void:
	if is_dragging:
		return
	is_hovered = true
	_kill_active_tween()

	tween = create_tween().set_parallel(true)
	tween.tween_property(self, "position:z", base_z_position - HOVER_Z_OFFSET, HOVER_ANIM_TIME) \
		.set_trans(Tween.TRANS_QUAD)
	tween.tween_property(self, "scale", Vector3.ONE * HOVER_SCALE, HOVER_ANIM_TIME)


## Fim do hover: restaura a posição Z de repouso.
func _on_mouse_exited() -> void:
	if is_holding:
		cancel_hold()
	if is_dragging:
		return

	is_hovered = false
	_kill_active_tween()

	tween = create_tween().set_parallel(true)
	tween.tween_property(self, "position:z", base_z_position, HOVER_ANIM_TIME) \
		.set_trans(Tween.TRANS_QUAD)
	tween.tween_property(self, "scale", Vector3.ONE, HOVER_ANIM_TIME)


func _on_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if not event is InputEventMouseButton:
		return

	if event.pressed:
		card_clicked.emit(self, event.button_index)
	elif event.button_index == MOUSE_BUTTON_LEFT and is_holding:
		cancel_hold()


func _kill_active_tween() -> void:
	if tween and tween.is_running():
		tween.kill()
