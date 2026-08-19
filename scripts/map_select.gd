## Tela de seleção de combate entre duelos — a "rota de cruzada": 5
## cartões (MapStageCard) da esquerda pra direita, na mesma ordem de
## RunState.STAGE_ORDER (acampamento, vilarejo, posto, fortaleza e por
## fim o castelo do Rei). Só o estágio corrente (RunState.current_stage) é
## jogável; os anteriores aparecem "Vencidos" e os seguintes "Bloqueados".
## Vencer o Rei soma +1 de rush e reinicia a rota do zero (ver
## RunState.report_victory()).
class_name MapSelect
extends Control

@onready var rush_label: Label = $Margin/VBox/TopBar/RushLabel
@onready var gold_label: Label = $Margin/VBox/TopBar/GoldLabel
@onready var hp_label: Label = $Margin/VBox/TopBar/HpLabel
@onready var cards_row: HBoxContainer = $Margin/VBox/CenterContainer/CardsRow

var _cards: Array[MapStageCard] = []


func _ready() -> void:
	for child in cards_row.get_children():
		if child is MapStageCard:
			_cards.append(child)
			child.fight_pressed.connect(_on_fight_pressed)
			child.avoid_pressed.connect(_on_avoid_pressed)

	_refresh()


func _refresh() -> void:
	rush_label.text = "Rush %d" % RunState.rush
	gold_label.text = "Ouro: %d" % RunState.gold
	hp_label.text = "Vida: %d/%d" % [RunState.player_hp, RunState.max_hp()]

	for i in range(_cards.size()):
		if i >= RunState.STAGE_ORDER.size():
			break
		var stage: RunState.Stage = RunState.STAGE_ORDER[i]
		_cards[i].configure(stage, _status_for(stage))


## "done" = já vencido nesta rota, "current" = o único jogável agora,
## "locked" = ainda não chegou a vez.
func _status_for(stage: RunState.Stage) -> String:
	var stage_index := RunState.STAGE_ORDER.find(stage)
	var current_index := RunState.STAGE_ORDER.find(RunState.current_stage)
	if stage_index < current_index:
		return "done"
	elif stage_index == current_index:
		return "current"
	return "locked"


func _on_fight_pressed(stage: RunState.Stage) -> void:
	RunState.start_fight(stage)


func _on_avoid_pressed(_stage: RunState.Stage) -> void:
	RunState.avoid_stage()
	_refresh()
