## Liga o DuelStateChart (addon godot_state_charts) à lógica de fases do
## duelo. É o único nó que envia eventos para o state chart e o único lugar
## que decide quem pode clicar em quê a cada fase.
class_name TurnManager
extends Node

@export var stub_phase_delay: float = 0.4

@onready var duel_scene: DuelScene = $".."
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

## A primeiríssima entrada em PlayerSummon (início da partida) não compra
## carta extra — a mão inicial já foi distribuída por DuelScene._ready().
var _is_first_player_summon: bool = true

var _selected_attackers: Array[CardInvocada] = []

var _current_enemy_attackers: Array[CardInvocada] = []
## Bloqueadora sendo "armada" pelo clique do jogador; o próximo clique num
## atacante inimigo a associa a ele (ver _on_player_blocker_clicked).
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


## Esconde o TimeoutIndicador de todas as cartas de `field` — usado ao
## sair de uma fase de seleção, ou quando ela é pulada por inteiro.
func _hide_all_indicators(field: Node3D) -> void:
	for card in field.get_children():
		if card is CardInvocada:
			card.set_selectable(true)


#region Invocação do jogador
func _on_player_summon_entered() -> void:
	is_player_summon_phase = true
	blood_manager.start_turn()
	_reset_turn_flags(player_field)

	if _is_first_player_summon:
		_is_first_player_summon = false
	else:
		_draw_card_for_turn()

	player_hand.set_interactive(true)
	end_turn_button.visible = true
	phase_label.text = "Invocação:\nJogador"


## Compra 1 carta do baralho do jogador pra mão. Se o baralho (e o
## descarte) estiverem totalmente vazios, DeckResource.draw_card() retorna
## null e simplesmente não compra nada.
func _draw_card_for_turn() -> void:
	if not duel_scene.player_deck_data:
		return
	var card_data := duel_scene.player_deck_data.draw_card()
	if card_data:
		player_hand.add_card_to_hand(card_data)


func _on_player_summon_exited() -> void:
	is_player_summon_phase = false
	player_hand.set_interactive(false)
	end_turn_button.visible = false
#endregion


#region Combate do jogador: seleção de atacantes
## Se nenhuma carta do campo puder atacar, pula a fase direto (sem
## esperar clique em nenhum botão).
func _on_select_attackers_entered() -> void:
	_selected_attackers.clear()

	var eligible: Array[CardInvocada] = []
	for card in player_field.get_children():
		if card is CardInvocada:
			var can_attack_now: bool = card.can_attack()
			card.set_selectable(can_attack_now)
			if can_attack_now:
				eligible.append(card)

	if eligible.is_empty():
		combat_manager.declared_attackers = []
		duel_state_chart.send_event("attackers_confirmed")
		return

	for card in eligible:
		card.card_invocada_clicked.connect(_on_player_field_card_clicked)

	phase_label.text = "Combate:\nSelecione seus atacantes"
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

	_hide_all_indicators(player_field)

	combat_manager.declared_attackers = _selected_attackers.duplicate()
	_selected_attackers.clear()

	duel_state_chart.send_event("attackers_confirmed")
#endregion


#region Combate do jogador: IA do oponente decide bloqueios
## Se o jogador atacou com 0 cartas, não há nada pra IA decidir — pula
## direto pra resolução (que também não terá nada a fazer).
func _on_enemy_defends_entered() -> void:
	if combat_manager.declared_attackers.is_empty():
		combat_manager.blocks = {}
		duel_state_chart.send_event("blockers_assigned")
		return

	phase_label.text = "Combate:\nOponente defende"
	combat_manager.blocks = enemy_ai_controller.decide_blocks(combat_manager.declared_attackers)
	combat_manager.refresh_attack_lines()

	await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("blockers_assigned")


func _on_resolve_damage_player_entered() -> void:
	var had_attackers := not combat_manager.declared_attackers.is_empty()
	if had_attackers:
		phase_label.text = "Resolvendo dano..."

	await combat_manager.resolve(true)

	if had_attackers:
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
	_current_enemy_attackers = enemy_ai_controller.decide_attackers()

	for card in _current_enemy_attackers:
		card.has_attacked_this_turn = true
		card.set_selected(true)

	combat_manager.declared_attackers = _current_enemy_attackers.duplicate()

	if _current_enemy_attackers.is_empty():
		duel_state_chart.send_event("enemy_attackers_chosen")
		return

	phase_label.text = "Combate:\nOponente ataca"
	await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("enemy_attackers_chosen")
#endregion


#region Combate do oponente: jogador escolhe bloqueadores
## Se o oponente não atacou com nada, ou se o jogador não tem nenhuma
## carta disponível pra bloquear, pula a fase direto.
func _on_player_defends_entered() -> void:
	combat_manager.blocks = {}
	_pending_blocker = null

	if _current_enemy_attackers.is_empty():
		duel_state_chart.send_event("player_blockers_assigned")
		return

	var has_eligible_blocker := false
	for card in player_field.get_children():
		if card is CardInvocada:
			var can_block_now: bool = card.can_block()
			card.set_selectable(can_block_now)
			if can_block_now:
				has_eligible_blocker = true
				card.card_invocada_clicked.connect(_on_player_blocker_clicked)

	if not has_eligible_blocker:
		_hide_all_indicators(player_field)
		duel_state_chart.send_event("player_blockers_assigned")
		return

	for attacker in _current_enemy_attackers:
		if is_instance_valid(attacker):
			attacker.card_invocada_clicked.connect(_on_enemy_attacker_clicked)

	phase_label.text = "Combate:\nEscolha seus bloqueadores"
	confirm_defense_button.visible = true


## Clique numa carta do jogador durante a fase de defesa: se ela já está
## bloqueando algum atacante, o clique a desassocia (libera a carta). Caso
## contrário, ela vira a bloqueadora "pendente" — o próximo clique num
## atacante inimigo a associa a ele. Várias cartas podem virar
## bloqueadoras pendentes em sequência e se acumular no mesmo atacante.
func _on_player_blocker_clicked(card: CardInvocada, button_index: int) -> void:
	if button_index != MOUSE_BUTTON_LEFT:
		return

	for attacker in combat_manager.blocks.keys():
		var blockers: Array = combat_manager.blocks[attacker]
		if card in blockers:
			blockers.erase(card)
			card.set_selected(false)
			combat_manager.refresh_attack_lines()
			return

	if _pending_blocker == card:
		_pending_blocker = null
		card.set_selected(false)
		return

	if _pending_blocker:
		_pending_blocker.set_selected(false)

	_pending_blocker = card
	card.set_selected(true)


## Clique num atacante inimigo: associa a bloqueadora pendente a ele. Não
## há limite de bloqueadoras por atacante — o jogador pode escalar quantas
## cartas disponíveis quiser pro mesmo alvo.
func _on_enemy_attacker_clicked(card: CardInvocada, button_index: int) -> void:
	if button_index != MOUSE_BUTTON_LEFT:
		return
	if not _pending_blocker:
		return

	if not combat_manager.blocks.has(card):
		combat_manager.blocks[card] = []
	combat_manager.blocks[card].append(_pending_blocker)

	_pending_blocker = null
	combat_manager.refresh_attack_lines()


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

	_hide_all_indicators(player_field)
	_pending_blocker = null

	duel_state_chart.send_event("player_blockers_assigned")


func _on_resolve_damage_enemy_entered() -> void:
	var had_attackers := not _current_enemy_attackers.is_empty()
	if had_attackers:
		phase_label.text = "Resolvendo dano..."

	for attacker in _current_enemy_attackers:
		if is_instance_valid(attacker):
			attacker.set_selected(false)
	_current_enemy_attackers.clear()

	await combat_manager.resolve(false)

	if had_attackers:
		await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("damage_resolved")
#endregion
