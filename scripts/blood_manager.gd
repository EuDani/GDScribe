## Controla o recurso "Sangue" de um dos lados do duelo (jogador ou
## oponente) — o equivalente ao "mana" do jogo, usado para pagar o custo de
## invocação das cartas. Cada lado tem sua própria instância deste nó.
class_name BloodManager
extends Node

## Emitido sempre que o Sangue atual ou o limite máximo mudam, para que a UI
## (Label3D do barril) e o TurnManager (fila de espera) se atualizem.
signal blood_changed(current_blood: int, max_blood: int)

## Teto absoluto que current_max_blood nunca ultrapassa, mesmo crescendo a
## cada turno.
@export var max_blood_limit: int = 10
## Quantidade de Sangue (e limite máximo) no primeiro turno da partida.
@export var inicial_blood: int = 1
## Quanto o limite máximo cresce a cada início de turno (ver start_turn()).
@export var blood_gain_per_turn: int = 1

var current_max_blood: int = 1
var current_blood: int = 1


func _ready() -> void:
	reset_blood()


## Reseta o sangue para o estado inicial da partida (chamado uma vez, no
## começo do duelo).
func reset_blood() -> void:
	current_max_blood = inicial_blood
	current_blood = inicial_blood
	blood_changed.emit(current_blood, current_max_blood)


## Início de turno deste lado: aumenta o limite máximo em blood_gain_per_turn
## (até max_blood_limit) e enche o tonel até esse novo máximo.
func start_turn() -> void:
	current_max_blood = mini(current_max_blood + blood_gain_per_turn, max_blood_limit)
	current_blood = current_max_blood
	blood_changed.emit(current_blood, current_max_blood)


## Tenta gastar Sangue para pagar o custo de uma carta/habilidade. Retorna
## true se havia Sangue suficiente e o gasto foi aplicado; false se não deu
## pra pagar (nesse caso nada é alterado).
func spend_blood(amount: int) -> bool:
	if current_blood >= amount:
		current_blood -= amount
		blood_changed.emit(current_blood, current_max_blood)
		return true
	return false


## Ganha Sangue extra neste turno (ex.: ao sacrificar uma carta). Nunca
## ultrapassa o limite máximo atual.
func add_blood(amount: int) -> void:
	current_blood = clampi(current_blood + amount, 0, current_max_blood)
	blood_changed.emit(current_blood, current_max_blood)


## Consulta se há Sangue suficiente para pagar `amount`, sem gastar nada.
func can_afford(amount: int) -> bool:
	return current_blood >= amount
