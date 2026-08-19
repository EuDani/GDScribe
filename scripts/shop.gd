## Loja — aparece depois de VENCER um combate (nunca ao evitar, já que
## RunState.avoid_stage() nunca passa por esta cena), antes de voltar ao
## mapa. Dois blocos verticais: em cima, 3 cartas aleatórias do catálogo
## pra comprar e adicionar ao baralho da run; embaixo, 3 melhorias fixas
## (+10 de Vida, +1 Defesa em 5 cartas aleatórias, +1 Ataque em 3 cartas
## aleatórias). "Avançar" confirma a passagem de estágio e volta ao mapa.
class_name Shop
extends Control

const CARD_OFFER_COUNT: int = 3
const CARD_PRICE: int = 5

const HP_UPGRADE_PRICE: int = 8
const HP_UPGRADE_AMOUNT: int = 10
const DEFENSE_UPGRADE_PRICE: int = 6
const DEFENSE_UPGRADE_CARD_COUNT: int = 5
const ATTACK_UPGRADE_PRICE: int = 6
const ATTACK_UPGRADE_CARD_COUNT: int = 3

@onready var gold_label: Label = $Margin/VBox/TopBar/GoldLabel
@onready var card_row: HBoxContainer = $Margin/VBox/CardsRow
@onready var upgrade_row: HBoxContainer = $Margin/VBox/UpgradesRow
@onready var advance_button: Button = $Margin/VBox/AdvanceButton

## Cartas sorteadas do catálogo pra esta visita à loja (uma vez em
## _ready(), não muda ao reabrir a mesma sessão de loja).
var _card_offers: Array[CardResource] = []
var _card_purchased: Array[bool] = []


func _ready() -> void:
	advance_button.pressed.connect(_on_advance_pressed)

	_roll_card_offers()

	for i in range(card_row.get_child_count()):
		var slot := card_row.get_child(i)
		slot.buy_pressed.connect(_on_buy_card.bind(i))

	upgrade_row.get_child(0).buy_pressed.connect(_on_buy_hp)
	upgrade_row.get_child(1).buy_pressed.connect(_on_buy_defense)
	upgrade_row.get_child(2).buy_pressed.connect(_on_buy_attack)

	_refresh()


func _roll_card_offers() -> void:
	var pool := RunState.card_catalog
	_card_offers.clear()
	_card_purchased.clear()
	for i in range(CARD_OFFER_COUNT):
		if pool.is_empty():
			break
		_card_offers.append(pool[randi() % pool.size()])
		_card_purchased.append(false)


func _refresh() -> void:
	gold_label.text = "Ouro: %d" % RunState.gold

	for i in range(card_row.get_child_count()):
		var slot := card_row.get_child(i)
		if i >= _card_offers.size():
			slot.visible = false
			continue

		var card: CardResource = _card_offers[i]
		slot.visible = true
		var desc := "Ataque %d / Defesa %d\nCusto de Sangue: %d" % [card.attack, card.defense, card.blood_cost]
		slot.configure(card.card_name, desc, CARD_PRICE, RunState.gold >= CARD_PRICE, _card_purchased[i])

	upgrade_row.get_child(0).configure(
		"+10 de Vida",
		"Aumenta sua vida máxima nesta cruzada em %d." % HP_UPGRADE_AMOUNT,
		HP_UPGRADE_PRICE,
		RunState.gold >= HP_UPGRADE_PRICE
	)
	upgrade_row.get_child(1).configure(
		"+1 Defesa em 5 Cartas",
		"%d cartas aleatórias do seu baralho ganham +1 de Defesa." % DEFENSE_UPGRADE_CARD_COUNT,
		DEFENSE_UPGRADE_PRICE,
		RunState.gold >= DEFENSE_UPGRADE_PRICE
	)
	upgrade_row.get_child(2).configure(
		"+1 Ataque em 3 Cartas",
		"%d cartas aleatórias do seu baralho ganham +1 de Ataque." % ATTACK_UPGRADE_CARD_COUNT,
		ATTACK_UPGRADE_PRICE,
		RunState.gold >= ATTACK_UPGRADE_PRICE
	)


func _on_buy_card(index: int) -> void:
	if index >= _card_offers.size() or _card_purchased[index]:
		return
	if not RunState.spend_gold(CARD_PRICE):
		return

	_card_purchased[index] = true
	RunState.player_card_pool.append(_card_offers[index].duplicate())
	_refresh()


func _on_buy_hp() -> void:
	if not RunState.spend_gold(HP_UPGRADE_PRICE):
		return
	RunState.buy_max_hp_upgrade(HP_UPGRADE_AMOUNT)
	_refresh()


func _on_buy_defense() -> void:
	if not RunState.spend_gold(DEFENSE_UPGRADE_PRICE):
		return
	RunState.buff_random_cards("defense", DEFENSE_UPGRADE_CARD_COUNT)
	_refresh()


func _on_buy_attack() -> void:
	if not RunState.spend_gold(ATTACK_UPGRADE_PRICE):
		return
	RunState.buff_random_cards("attack", ATTACK_UPGRADE_CARD_COUNT)
	_refresh()


func _on_advance_pressed() -> void:
	RunState.advance_after_shop()
