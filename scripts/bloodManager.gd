class_name BloodManager
extends Node

signal blood_changed(current_blood: int, max_blood: int)

@export var max_blood_limit: int = 10
@export var inicial_blood: int = 1

var current_max_blood: int = 1
var current_blood: int = 1

func _ready() -> void:
	reset_blood()

## Reseta o sangue para o início da partida
func reset_blood() -> void:
	current_max_blood = inicial_blood
	current_blood = inicial_blood
	blood_changed.emit(current_blood, current_max_blood)

## Início do turno: aumenta o limite máximo (até 10) e enche o tonel
func start_turn() -> void:
	current_max_blood = mini(current_max_blood + 1, max_blood_limit)
	current_blood = current_max_blood
	blood_changed.emit(current_blood, current_max_blood)

## Tenta gastar Sangue. Retorna true se teve sucesso
func spend_blood(amount: int) -> bool:
	if current_blood >= amount:
		current_blood -= amount
		blood_changed.emit(current_blood, current_max_blood)
		return true
	return false

## Ganha Sangue (por exemplo, ao sacrificar uma carta)
func add_blood(amount: int) -> void:
	current_blood = clampi(current_blood + amount, 0, current_max_blood)
	blood_changed.emit(current_blood, current_max_blood)

func can_afford(amount: int) -> bool:
	return current_blood >= amount
