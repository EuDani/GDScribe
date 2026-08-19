## Classe base para qualquer representação visual 3D de uma carta.
##
## Concentra as referências de nó e a lógica de preenchimento da UI que eram
## duplicadas entre Card3D (carta na mão) e CardInvocada (carta em campo).
## Cada subclasse é livre para sobrescrever `update_visuals()` e chamar
## `super.update_visuals()` para reaproveitar o preenchimento básico.
class_name CardVisualBase
extends Node3D

## Ao ser atribuído depois que o nó já está pronto (ex.: trocar a carta de
## uma instância reaproveitada), atualiza a UI imediatamente. Antes disso
## (durante a construção da cena), o valor só é guardado — quem dispara o
## preenchimento inicial é o próprio _ready().
@export var card_data: CardResource:
	set(value):
		card_data = value
		if is_node_ready():
			update_visuals()

@onready var name_label: Label = $CardViewport/CardUI/NameLabel
@onready var blood_cost_label: Label = $CardViewport/CardUI/HeaderPanel/BloodCostLabel
@onready var attack_label: Label = $CardViewport/CardUI/FooterPanel/AttackLabel
@onready var defense_label: Label = $CardViewport/CardUI/FooterPanel/DefenseLabel
## Só aparecem quando a carta tem Escudo/Horda (a maioria não tem) — ver
## _update_shield_horde_labels().
@onready var shield_label: Label = $CardViewport/CardUI/FooterPanel/ShieldLabel
@onready var horde_label: Label = $CardViewport/CardUI/FooterPanel/HordeLabel
@onready var artwork_rect: TextureRect = $CardViewport/CardUI/Artwork
@onready var card_area: Area3D = $CardArea
@onready var skill_button_1: Button = $CardViewport/CardUI/Skills/skill1
@onready var skill_button_2: Button = $CardViewport/CardUI/Skills/skill2
@onready var skill_button_3: Button = $CardViewport/CardUI/Skills/skill3


func _ready() -> void:
	if card_data:
		update_visuals()


## Preenche os elementos visuais comuns a partir de card_data.
## Subclasses devem chamar `super.update_visuals()` antes de aplicar
## particularidades próprias (ex.: esconder ATK/DEF em cartas de Efeito).
func update_visuals() -> void:
	if not card_data:
		return

	name_label.text = card_data.card_name
	blood_cost_label.text = str(card_data.blood_cost)
	attack_label.text = str(card_data.attack)
	defense_label.text = str(card_data.defense)
	_update_shield_horde_labels(card_data.shield, card_data.horde)

	if card_data.artwork:
		artwork_rect.texture = card_data.artwork

	_update_skill_icons()


## Mostra os valores impressos de Escudo/Horda (só quando > 0 — a maioria
## das cartas não tem nenhum dos dois). CardInvocada chama de novo com os
## valores ATUAIS (current_shield/current_horde) sempre que eles mudam em
## combate, sobrescrevendo os impressos aqui (ver refresh_stat_labels()).
func _update_shield_horde_labels(shield: int, horde: int) -> void:
	if shield_label:
		shield_label.visible = shield > 0
		if shield > 0:
			shield_label.text = "🛡%d" % shield
	if horde_label:
		horde_label.visible = horde > 0
		if horde > 0:
			horde_label.text = "♻%d" % horde


## Mostra/esconde os botões skill1/2/3 conforme as habilidades da carta e
## preenche o ícone (icon_emoji) de cada uma. Cartas com menos de 3
## habilidades escondem os botões sobrando.
func _update_skill_icons() -> void:
	var buttons := [skill_button_1, skill_button_2, skill_button_3]
	for i in range(buttons.size()):
		var button: Button = buttons[i]
		if not button:
			continue
		var has_ability: bool = i < card_data.abilities.size() and card_data.abilities[i] != null
		button.visible = has_ability
		if has_ability:
			button.text = card_data.abilities[i].icon_emoji
