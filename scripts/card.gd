## Representa uma carta interativa na mão do jogador (arrastável, com hover
## e destaque visual de sacrifício).
class_name Card3D
extends CardVisualBase

signal card_clicked(card_node: Card3D, button_index: int)

@onready var card_mesh: MeshInstance3D = $CardMesh

# --- Parâmetros de animação ---
@export var HOVER_ANIM_TIME: float = 0.15
@export var HOVER_Z_OFFSET: float = 1.36
@export var HOVER_SCALE: float = 1.1
@export var DRAG_SCALE: float = 1.3
@export var DRAG_ANIM_TIME: float = 0.15

## Cor aplicada ao material da carta enquanto ela está sendo arrastada em
## cima do barril de Sangue, avisando que soltá-la ali agora a sacrifica.
const SACRIFICE_TINT_COLOR: Color = Color(1.0, 0.15, 0.15, 1.0)
const NORMAL_TINT_COLOR: Color = Color(1.0, 1.0, 1.0, 1.0)

var is_hovered: bool = false
var is_dragging: bool = false
## Posição/profundidade de repouso na mão, calculadas por PlayerHand.reorganize_hand()
## e usadas como referência pelos tweens de hover (voltar ao lugar ao tirar o mouse).
@export var base_y_position: float = 0.0
@export var base_z_position: float = 0.0
var tween: Tween


func _ready() -> void:
	super._ready()
	card_area.mouse_entered.connect(_on_mouse_entered)
	card_area.mouse_exited.connect(_on_mouse_exited)
	card_area.input_event.connect(_on_input_event)


## Preenche os textos básicos (via CardVisualBase) e aplica regras próprias
## da mão: cartas de Efeito não exibem ATK/DEF (não fazem sentido pra um
## efeito instantâneo que não fica em campo).
func update_visuals() -> void:
	super.update_visuals()
	if not card_data:
		return

	var is_effect := card_data.is_effect
	attack_label.visible = not is_effect
	defense_label.visible = not is_effect


## Inicia o arraste: cancela hover/tweens ativos e aplica zoom de "pegar".
func start_drag() -> void:
	is_dragging = true
	is_hovered = false
	_kill_active_tween()

	tween = create_tween().set_parallel(true)
	tween.tween_property(self, "scale", Vector3.ONE * DRAG_SCALE, DRAG_ANIM_TIME) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


## Tinge a carta de vermelho (ou volta ao normal) — chamado pelo DuelScene
## a cada frame de arraste conforme a carta está ou não em cima do barril
## de Sangue, como aviso visual de que soltá-la ali a sacrifica.
func set_sacrifice_highlight(active: bool) -> void:
	var material := card_mesh.material_override as StandardMaterial3D
	if material:
		material.albedo_color = SACRIFICE_TINT_COLOR if active else NORMAL_TINT_COLOR


## Hover: aproxima a carta da câmera no eixo Z, sem alterar Y.
func _on_mouse_entered() -> void:
	if is_dragging:
		return
	is_hovered = true
	_kill_active_tween()

	tween = create_tween().set_parallel(true)
	tween.tween_property(self, "position:z", base_z_position - HOVER_Z_OFFSET, HOVER_ANIM_TIME) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(self, "scale", Vector3.ONE * HOVER_SCALE, HOVER_ANIM_TIME) \
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


## Fim do hover: restaura a posição Z de repouso.
func _on_mouse_exited() -> void:
	if is_dragging:
		return

	is_hovered = false
	_kill_active_tween()

	tween = create_tween().set_parallel(true)
	tween.tween_property(self, "position:z", base_z_position, HOVER_ANIM_TIME) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(self, "scale", Vector3.ONE, HOVER_ANIM_TIME) \
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)


func _on_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if not event is InputEventMouseButton:
		return

	if event.pressed:
		card_clicked.emit(self, event.button_index)


func _kill_active_tween() -> void:
	if tween and tween.is_running():
		tween.kill()
