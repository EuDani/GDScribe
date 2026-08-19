## Códigos secretos de debug — aperte F8 em qualquer tela pra abrir um
## campinho de texto e digitar um código:
## - "money": +100 de Ouro na run atual.
## - "blood": Sangue infinito pro jogador (pode invocar qualquer carta,
##   custe o que custar) — consultado por BloodManager.can_afford()/
##   spend_blood(), só no lado marcado como respects_infinite_blood_cheat.
## - "life": vida infinita pro jogador — consultado por CombatManager.resolve()
##   antes de aplicar dano não bloqueado à vida do jogador.
## Autoload (ver project.godot [autoload]) pra funcionar em qualquer cena
## (mapa, loja, duelo) e persistir os cheats entre trocas de cena.
extends CanvasLayer

var infinite_blood: bool = false
var infinite_life: bool = false

var _input_field: LineEdit


func _ready() -> void:
	layer = 100
	process_mode = Node.PROCESS_MODE_ALWAYS

	_input_field = LineEdit.new()
	_input_field.visible = false
	_input_field.placeholder_text = "código secreto..."
	_input_field.custom_minimum_size = Vector2(240, 32)
	_input_field.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_input_field.position -= Vector2(120, 50)
	_input_field.process_mode = Node.PROCESS_MODE_ALWAYS
	_input_field.text_submitted.connect(_on_code_submitted)
	add_child(_input_field)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.is_echo() and event.keycode == KEY_F3:
		_toggle_input_field()
		get_viewport().set_input_as_handled()


func _toggle_input_field() -> void:
	_input_field.visible = not _input_field.visible
	if _input_field.visible:
		_input_field.text = ""
		_input_field.grab_focus()
	else:
		_input_field.release_focus()


func _on_code_submitted(text: String) -> void:
	match text.strip_edges().to_lower():
		"money":
			print("dinheiro infinito")
			RunState.gold += 100
		"blood":
			print("sangue infinito")
			infinite_blood = true
		"life":
			print("vida infinito")
			infinite_life = true

	_input_field.text = ""
	_input_field.visible = false
	_input_field.release_focus()
