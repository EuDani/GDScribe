## Um cartão da rota de cruzada (mapa de seleção de combate) — representa
## um estágio (acampamento, vilarejo, posto, fortaleza ou o castelo do
## Rei). Configurado por MapSelect._refresh(), que chama configure() em
## cada instância com o estágio e o status atual (vencido/atual/bloqueado).
class_name MapStageCard
extends Panel

signal fight_pressed(stage: RunState.Stage)
signal avoid_pressed(stage: RunState.Stage)

## Cores/bordas "de pedra medieval" por status: bloqueado = pedra escura e
## fria, atual = pedra clara com borda dourada acesa (tocha), vencido =
## pedra tomada por musgo verde.
const PANEL_COLOR := {
	"locked": Color(0.12, 0.1, 0.09, 1.0),
	"current": Color(0.22, 0.17, 0.12, 1.0),
	"done": Color(0.11, 0.15, 0.1, 1.0),
}
const BORDER_COLOR := {
	"locked": Color(0.3, 0.26, 0.2, 1.0),
	"current": Color(0.85, 0.65, 0.25, 1.0),
	"done": Color(0.4, 0.6, 0.35, 1.0),
}
const TEXT_COLOR := Color(0.93, 0.87, 0.74, 1.0)
const MUTED_TEXT_COLOR := Color(0.62, 0.56, 0.47, 1.0)
const GOLD_TEXT_COLOR := Color(0.9, 0.72, 0.3, 1.0)

@onready var title_label: Label = $VBox/TitleLabel
@onready var personality_label: Label = $VBox/PersonalityLabel
@onready var desc_label: Label = $VBox/DescLabel
@onready var reward_label: Label = $VBox/RewardLabel
@onready var status_label: Label = $VBox/StatusLabel
@onready var fight_button: Button = $VBox/FightButton
@onready var avoid_button: Button = $VBox/AvoidButton

var stage: RunState.Stage


func _ready() -> void:
	fight_button.pressed.connect(func() -> void: fight_pressed.emit(stage))
	avoid_button.pressed.connect(func() -> void: avoid_pressed.emit(stage))


## status: "done" (já vencido nesta rota), "current" (o único jogável
## agora) ou "locked" (ainda não chegou a vez).
func configure(new_stage: RunState.Stage, status: String) -> void:
	stage = new_stage

	title_label.text = RunState.STAGE_TITLE[stage]
	desc_label.text = RunState.STAGE_DESC[stage]

	var personality: EnemyPersonality = RunState.personality_for(stage)
	personality_label.text = "Personalidade: %s" % (personality.display_name() if personality else "?")
	# Só revela a personalidade quando o estágio já está acessível (jogado
	# ou jogável agora) — os bloqueados ficam em suspense.
	personality_label.visible = status != "locked"

	var gold: int = RunState.GOLD_REWARD.get(stage, 0)
	reward_label.visible = gold > 0
	reward_label.text = "+%d de Ouro" % gold

	status_label.visible = status != "current"
	status_label.text = "Vencido" if status == "done" else "Bloqueado"
	status_label.add_theme_color_override("font_color", BORDER_COLOR[status])

	fight_button.visible = status == "current"
	avoid_button.visible = status == "current" and stage != RunState.Stage.KING

	var style := StyleBoxFlat.new()
	style.bg_color = PANEL_COLOR[status]
	style.border_color = BORDER_COLOR[status]
	style.set_border_width_all(4 if status == "current" else 2)
	style.set_corner_radius_all(10)
	style.set_content_margin_all(18)
	if status == "current":
		style.shadow_color = Color(0.85, 0.65, 0.25, 0.4)
		style.shadow_size = 14
	add_theme_stylebox_override("panel", style)
