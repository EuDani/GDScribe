## Liga o DuelStateChart (addon godot_state_charts) à lógica de fases do
## duelo. É o único nó que envia eventos para o state chart e o único lugar
## que decide quem pode clicar em quê a cada fase.
class_name TurnManager
extends Node

@export var stub_phase_delay: float = 0.4

@onready var duel_state_chart: StateChart = $"../DuelStateChart"

@onready var state_player_summon: AtomicState = $"../DuelStateChart/Root/PlayerTurn/PlayerSummon"
@onready var state_select_attackers: AtomicState = $"../DuelStateChart/Root/PlayerTurn/PlayerCombat/SelectAttackers"
@onready var state_enemy_defends: AtomicState = $"../DuelStateChart/Root/PlayerTurn/PlayerCombat/EnemyDefends"
@onready var state_resolve_damage_player: AtomicState = $"../DuelStateChart/Root/PlayerTurn/PlayerCombat/ResolveDamage"
@onready var state_enemy_invocation: AtomicState = $"../DuelStateChart/Root/EnemyTurn/EnemyInvocation"
@onready var state_enemy_choose_attacker: AtomicState = $"../DuelStateChart/Root/EnemyTurn/EnemyCombat/EnemyChooseAttacker"
@onready var state_player_defends: AtomicState = $"../DuelStateChart/Root/EnemyTurn/EnemyCombat/PlayerDefends"
@onready var state_resolve_damage_enemy: AtomicState = $"../DuelStateChart/Root/EnemyTurn/EnemyCombat/ResolveDamage"

@onready var player_hand: PlayerHand = $"../PlayerHandAnchor"
@onready var player_field: Node3D = $"../FieldAnchors/PlayerField"
@onready var enemy_field: Node3D = $"../FieldAnchors/EnemyField"
@onready var blood_manager: BloodManager = $"../BloodManager"
@onready var enemy_blood_manager: BloodManager = $"../EnemyBloodManager"
@onready var combat_manager: CombatManager = $"../CombatManager"
@onready var enemy_ai_controller: EnemyAiController = $"../EnemyAiController"
@onready var phase_label: Label = $"../Hud/PhaseLabel"
@onready var end_turn_button: Button = $"../Hud/EndTurnButton"
@onready var confirm_attack_button: Button = $"../Hud/ConfirmAttackButton"
@onready var confirm_defense_button: Button = $"../Hud/ConfirmDefenseButton"

## true apenas durante a fase de Invocação do jogador — usado por DuelScene
## para liberar/bloquear arraste de cartas e o modo sacrifício.
var is_player_summon_phase: bool = false

var _selected_attackers: Array[CardInvocada] = []

var _current_enemy_attackers: Array[CardInvocada] = []
var _player_blocks: Dictionary = {}  # atacante inimigo -> bloqueador do jogador
var _pending_blocker: CardInvocada = null


func _ready() -> void:
	state_player_summon.state_entered.connect(_on_player_summon_entered)
	state_player_summon.state_exited.connect(_on_player_summon_exited)

	state_select_attackers.state_entered.connect(_on_select_attackers_entered)
	state_enemy_defends.state_entered.connect(_on_enemy_defends_entered)
	state_resolve_damage_player.state_entered.connect(_on_resolve_damage_player_entered)
	state_enemy_invocation.state_entered.connect(_on_enemy_invocation_entered)
	state_enemy_choose_attacker.state_entered.connect(_on_enemy_choose_attacker_entered)
	state_player_defends.state_entered.connect(_on_player_defends_entered)
	state_resolve_damage_enemy.state_entered.connect(_on_resolve_damage_enemy_entered)

	end_turn_button.pressed.connect(_on_end_turn_button_pressed)
	confirm_attack_button.pressed.connect(_on_confirm_attack_pressed)
	confirm_defense_button.pressed.connect(_on_confirm_defense_pressed)

	confirm_attack_button.visible = false
	confirm_defense_button.visible = false


func _on_end_turn_button_pressed() -> void:
	if not is_player_summon_phase:
		return
	duel_state_chart.send_event("end_turn_pressed")


func _reset_turn_flags(field: Node3D) -> void:
	for card in field.get_children():
		if card is CardInvocada:
			card.is_summoning_sick = false
			card.has_attacked_this_turn = false


#region Invocação do jogador
func _on_player_summon_entered() -> void:
	is_player_summon_phase = true
	blood_manager.start_turn()
	_reset_turn_flags(player_field)
	player_hand.set_interactive(true)
	end_turn_button.visible = true
	phase_label.text = "Invocação:\nJogador"


func _on_player_summon_exited() -> void:
	is_player_summon_phase = false
	player_hand.set_interactive(false)
	end_turn_button.visible = false
#endregion


#region Combate do jogador: seleção de atacantes
func _on_select_attackers_entered() -> void:
	phase_label.text = "Combate:\nSelecione seus atacantes"
	_selected_attackers.clear()

	for card in player_field.get_children():
		if card is CardInvocada and card.can_attack():
			card.card_invocada_clicked.connect(_on_player_field_card_clicked)

	confirm_attack_button.visible = true


func _on_player_field_card_clicked(card: CardInvocada, button_index: int) -> void:
	if button_index != MOUSE_BUTTON_LEFT:
		return

	if card.is_selected:
		card.set_selected(false)
		_selected_attackers.erase(card)
	else:
		card.set_selected(true)
		_selected_attackers.append(card)


func _on_confirm_attack_pressed() -> void:
	confirm_attack_button.visible = false

	for card in player_field.get_children():
		if card is CardInvocada and card.card_invocada_clicked.is_connected(_on_player_field_card_clicked):
			card.card_invocada_clicked.disconnect(_on_player_field_card_clicked)

	for card in _selected_attackers:
		card.has_attacked_this_turn = true
		card.set_selected(false)

	combat_manager.declared_attackers = _selected_attackers.duplicate()
	_selected_attackers.clear()

	duel_state_chart.send_event("attackers_confirmed")
#endregion


#region Combate do jogador: IA do oponente decide bloqueios
func _on_enemy_defends_entered() -> void:
	phase_label.text = "Combate:\nOponente defende"
	combat_manager.blocks = enemy_ai_controller.decide_blocks(combat_manager.declared_attackers)
	await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("blockers_assigned")


func _on_resolve_damage_player_entered() -> void:
	phase_label.text = "Resolvendo dano..."
	combat_manager.resolve(true)
	await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("damage_resolved")
#endregion


#region Turno do oponente: invocação (IA)
func _on_enemy_invocation_entered() -> void:
	phase_label.text = "Invocação:\nOponente"
	enemy_blood_manager.start_turn()
	_reset_turn_flags(enemy_field)
	await enemy_ai_controller.run_invocation_phase()
	duel_state_chart.send_event("enemy_invocation_done")
#endregion


#region Combate do oponente: IA escolhe atacantes
func _on_enemy_choose_attacker_entered() -> void:
	phase_label.text = "Combate:\nOponente ataca"
	_current_enemy_attackers = enemy_ai_controller.decide_attackers()

	for card in _current_enemy_attackers:
		card.has_attacked_this_turn = true
		card.set_selected(true)

	combat_manager.declared_attackers = _current_enemy_attackers.duplicate()

	await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("enemy_attackers_chosen")
#endregion


#region Combate do oponente: jogador escolhe bloqueadores
func _on_player_defends_entered() -> void:
	phase_label.text = "Combate:\nEscolha seus bloqueadores"
	_player_blocks.clear()
	_pending_blocker = null

	for attacker in _current_enemy_attackers:
		if is_instance_valid(attacker):
			attacker.card_invocada_clicked.connect(_on_enemy_attacker_clicked)

	for card in player_field.get_children():
		if card is CardInvocada and card.can_block():
			card.card_invocada_clicked.connect(_on_player_blocker_clicked)

	confirm_defense_button.visible = true


## Clique numa carta do jogador: escolhe/desmarca ela como bloqueadora
## "pendente" — o próximo clique num atacante inimigo a escala pra ele.
func _on_player_blocker_clicked(card: CardInvocada, button_index: int) -> void:
	if button_index != MOUSE_BUTTON_LEFT:
		return

	for attacker in _player_blocks.keys():
		if _player_blocks[attacker] == card:
			_player_blocks.erase(attacker)
			card.set_selected(false)
			return

	if _pending_blocker == card:
		_pending_blocker = null
		card.set_selected(false)
		return

	if _pending_blocker:
		_pending_blocker.set_selected(false)

	_pending_blocker = card
	card.set_selected(true)


## Clique num atacante inimigo: escala a bloqueadora pendente pra ele.
func _on_enemy_attacker_clicked(card: CardInvocada, button_index: int) -> void:
	if button_index != MOUSE_BUTTON_LEFT:
		return
	if not _pending_blocker or _player_blocks.has(card):
		return

	_player_blocks[card] = _pending_blocker
	_pending_blocker = null


func _on_confirm_defense_pressed() -> void:
	confirm_defense_button.visible = false

	for attacker in _current_enemy_attackers:
		if is_instance_valid(attacker) and attacker.card_invocada_clicked.is_connected(_on_enemy_attacker_clicked):
			attacker.card_invocada_clicked.disconnect(_on_enemy_attacker_clicked)

	for card in player_field.get_children():
		if card is CardInvocada:
			if card.card_invocada_clicked.is_connected(_on_player_blocker_clicked):
				card.card_invocada_clicked.disconnect(_on_player_blocker_clicked)
			card.set_selected(false)

	combat_manager.blocks = _player_blocks.duplicate()
	_pending_blocker = null

	duel_state_chart.send_event("player_blockers_assigned")


func _on_resolve_damage_enemy_entered() -> void:
	phase_label.text = "Resolvendo dano..."
	for attacker in _current_enemy_attackers:
		if is_instance_valid(attacker):
			attacker.set_selected(false)
	_current_enemy_attackers.clear()

	combat_manager.resolve(false)
	await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("damage_resolved")
#endregion
