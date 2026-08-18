## Modal que exibe a lista de cartas do deck inicial do jogador, desenhando
## cada carta com o próprio CardUI usado em campo (extraído de card.tscn).
class_name DeckModal
extends CanvasLayer

const EMPTY_DECK_MESSAGE := "Nenhuma carta cadastrada no Deck Inicial."

## Cena da carta 3D (Card / CardVisualBase) de onde extraímos apenas o
## CardUI (CardViewport/CardUI) para exibir como preview 2D no grid.
@export var card_scene: PackedScene = preload("res://scenes/card.tscn")

@onready var card_grid: GridContainer = $Overlay/PanelContainer/VBoxContainer/ScrollContainer/CardGrid
@onready var close_button: Button = $Overlay/PanelContainer/VBoxContainer/CloseButton


func _ready() -> void:
	visible = false
	if close_button:
		close_button.pressed.connect(hide_modal)


## Exibe o modal preenchido com as cartas de deck_resource.
func show_deck(deck_resource: DeckResource) -> void:
	visible = true

	# Garante que a árvore de nós carregou completamente antes de prosseguir.
	if not is_node_ready():
		await ready

	if not card_grid:
		push_error("DeckModal: nó CardGrid não encontrado. Verifique a hierarquia de deck_modal.tscn.")
		return

	_clear_grid()

	if not deck_resource or deck_resource.cards.is_empty():
		_add_empty_message()
		return

	for card_data in deck_resource.cards:
		if card_data:
			_add_card_visual(card_data)


func hide_modal() -> void:
	visible = false


#func _unhandled_input(event: InputEvent) -> void:
	#if visible and event is InputEventMouseButton and event.pressed:
		#hide_modal()


func _clear_grid() -> void:
	for child in card_grid.get_children():
		child.queue_free()


## Instancia card.tscn, deixa a árvore preencher os textos (via _ready ->
## update_visuals do CardVisualBase) e então extrai só o Control CardUI,
## descartando o restante da cena (mesh 3D, área de colisão, viewport).
func _add_card_visual(card_data: CardResource) -> void:
	if not card_scene:
		push_error("DeckModal: card_scene não atribuída, não é possível desenhar a carta.")
		return

	var card_instance := card_scene.instantiate()
	card_instance.card_data = card_data  # ainda fora da árvore: setter só guarda o valor.
	add_child(card_instance)             # entra na árvore -> _ready() preenche os labels.

	var card_ui := card_instance.get_node_or_null("CardViewport/CardUI") as Control
	if not card_ui:
		push_error("DeckModal: nó CardUI não encontrado em card.tscn.")
		card_instance.queue_free()
		return

	card_ui.get_parent().remove_child(card_ui)
	card_grid.add_child(card_ui)
	card_instance.queue_free()  # Libera o restante: CardMesh, CardArea, CardViewport vazio.


func _add_empty_message() -> void:
	var label := Label.new()
	label.text = EMPTY_DECK_MESSAGE
	card_grid.add_child(label)
