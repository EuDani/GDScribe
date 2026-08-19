## Um item comprável da loja — usado tanto pras 3 cartas oferecidas
## quanto pras 3 melhorias (vida/defesa/ataque). Genérico de propósito:
## Shop._refresh() decide o texto e a lógica de compra de cada slot.
class_name ShopItem
extends Panel

signal buy_pressed()

const PANEL_COLOR := Color(0.16, 0.13, 0.1, 1.0)
const BORDER_COLOR := Color(0.4, 0.34, 0.25, 1.0)
const BORDER_COLOR_AFFORDABLE := Color(0.75, 0.6, 0.25, 1.0)
const TEXT_COLOR := Color(0.93, 0.87, 0.74, 1.0)
const MUTED_TEXT_COLOR := Color(0.62, 0.56, 0.47, 1.0)
const GOLD_TEXT_COLOR := Color(0.9, 0.72, 0.3, 1.0)

@onready var title_label: Label = $VBox/TitleLabel
@onready var desc_label: Label = $VBox/DescLabel
@onready var price_label: Label = $VBox/PriceLabel
@onready var buy_button: Button = $VBox/BuyButton


func _ready() -> void:
	buy_button.pressed.connect(func() -> void: buy_pressed.emit())


## `purchased` trava o botão permanentemente (usado pelas ofertas de
## carta, que só podem ser compradas uma vez por visita à loja) —
## melhorias repetíveis (vida/defesa/ataque) sempre passam false aqui.
func configure(title: String, desc: String, price: int, can_afford: bool, purchased: bool = false) -> void:
	title_label.text = title
	desc_label.text = desc
	price_label.text = "%d de Ouro" % price
	price_label.add_theme_color_override("font_color", GOLD_TEXT_COLOR if can_afford else MUTED_TEXT_COLOR)

	buy_button.disabled = purchased or not can_afford
	buy_button.text = "Comprado" if purchased else "Comprar"

	var style := StyleBoxFlat.new()
	style.bg_color = PANEL_COLOR
	style.border_color = BORDER_COLOR_AFFORDABLE if (can_afford and not purchased) else BORDER_COLOR
	style.set_border_width_all(2)
	style.set_corner_radius_all(8)
	style.set_content_margin_all(10)
	add_theme_stylebox_override("panel", style)
