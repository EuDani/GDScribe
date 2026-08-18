## Dados de um baralho completo: a lista de cartas registradas (o "molde"
## configurado no editor) mais o estado de runtime da partida (pilha de
## compra e descarte). initialize_deck() separa uma coisa da outra.
class_name DeckResource
extends Resource

@export_group("Configuração do Deck")
@export var deck_name: String = "Novo Baralho"
## Tática associada a este baralho (a carta de liderança que define a
## identidade estratégica do jogador na partida).
@export var tactic: TacticResource
## Lista de cartas registradas no baralho tal como configurada no editor.
## Pode conter repetições (a mesma carta várias vezes, como num deck real).
@export var cards: Array[CardResource] = []

# Variáveis em memória (runtime) para controle durante a partida
var _draw_pile: Array[CardResource] = []
var _discard_pile: Array[CardResource] = []


## Prepara a pilha de compra duplicando as cartas registradas e
## embaralhando. Deve ser chamado uma vez no início de cada partida — as
## duplicatas garantem que alterações feitas durante o jogo (ex.: dano
## acumulado numa carta) nunca modifiquem o CardResource original salvo em
## disco.
func initialize_deck() -> void:
	_draw_pile.clear()
	_discard_pile.clear()

	# Cria cópias locais para que as alterações na partida não modifiquem o arquivo de dados original
	for card in cards:
		if card != null:
			_draw_pile.append(card.duplicate())
	shuffle()


## Embaralha as cartas disponíveis na pilha de compra.
func shuffle() -> void:
	_draw_pile.shuffle()


## Compra uma carta do topo do baralho, reciclando o descarte automaticamente
## se a pilha de compra estiver vazia. Retorna null se não houver mais
## cartas em lugar nenhum (baralho totalmente esgotado).
func draw_card() -> CardResource:
	if _draw_pile.is_empty():
		_recycle_discard_pile()

	if _draw_pile.is_empty():
		push_warning("Tentativa de comprar carta de um deck totalmente vazio!")
		return null

	return _draw_pile.pop_back()


## Envia uma carta usada (ex.: sacrificada, ou um Efeito instantâneo já
## resolvido) para a pilha de descarte.
func discard_card(card: CardResource) -> void:
	if card != null:
		_discard_pile.append(card)


## Retorna a quantidade de cartas restantes na pilha de compra (sem contar o
## descarte).
func get_remaining_cards_count() -> int:
	return _draw_pile.size()


## Transfere as cartas descartadas de volta para a pilha de compra e
## reembaralha, quando a pilha de compra acaba no meio da partida.
func _recycle_discard_pile() -> void:
	if _discard_pile.is_empty():
		return

	_draw_pile = _discard_pile.duplicate()
	_discard_pile.clear()
	shuffle()
