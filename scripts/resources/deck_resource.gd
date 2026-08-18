class_name DeckResource
extends Resource

@export_group("Configuração do Deck")
@export var deck_name: String = "Novo Baralho"
@export var general: GeneralResource
@export var cards: Array[CardResource] = []

# Variáveis em memória (runtime) para controle durante a partida
var _draw_pile: Array[CardResource] = []
var _discard_pile: Array[CardResource] = []

## Prepara a pilha de compras duplicando as cartas registradas e embaralhando
func initialize_deck() -> void:
	_draw_pile.clear()
	_discard_pile.clear()
	
	# Cria cópias locais para que as alterações na partida não modifiquem o arquivo de dados original
	for card in cards:
		if card != null:
			_draw_pile.append(card.duplicate())
	shuffle()

## Embaralha as cartas disponíveis na pilha de compra
func shuffle() -> void:
	_draw_pile.shuffle()

## Compra uma carta do topo do baralho. Retorna null se o baralho estiver vazio.
func draw_card() -> CardResource:
	if _draw_pile.is_empty():
		_recycle_discard_pile()
		
	if _draw_pile.is_empty():
		push_warning("Tentativa de comprar carta de um deck totalmente vazio!")
		return null
		
	return _draw_pile.pop_back()

## Envia uma carta usada para a pilha de descarte
func discard_card(card: CardResource) -> void:
	if card != null:
		_discard_pile.append(card)

## Retorna a contagem de cartas restantes na pilha de compra
func get_remaining_cards_count() -> int:
	return _draw_pile.size()

## Transfere as cartas descartadas de volta para a pilha de compra se ela acabar
func _recycle_discard_pile() -> void:
	if _discard_pile.is_empty():
		return
		
	_draw_pile = _discard_pile.duplicate()
	_discard_pile.clear()
	shuffle()
