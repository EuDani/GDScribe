## Liga o DuelStateChart (addon godot_state_charts) à lógica de fases do
## duelo. É o único nó que envia eventos para o state chart e o único lugar
## que decide quem pode clicar em quê a cada fase.
class_name TurnManager
extends Node

@export var stub_phase_delay: float = 0.4

@onready var duel_scene: DuelScene = $".."
@onready var duel_state_chart: StateChart = $"../DuelStateChart"

## PlayerSummon cobre as duas coisas ao mesmo tempo: invocar cartas da mão
## E marcar quais cartas do campo vão atacar. Não existe mais uma fase
## separada só de seleção de atacantes — apertar EndTurnButton confirma o
## que estiver marcado e já avança pro combate.
@onready var state_player_summon: AtomicState = $"../DuelStateChart/Root/PlayerTurn/PlayerSummon"
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
@onready var confirm_defense_button: Button = $"../Hud/ConfirmDefenseButton"

## true apenas durante a fase de Invocação do jogador — usado por DuelScene
## para liberar/bloquear arraste de cartas e o modo sacrifício.
var is_player_summon_phase: bool = false

## A primeiríssima entrada em PlayerSummon (início da partida) não compra
## carta extra — a mão inicial já foi distribuída por DuelScene._ready().
var _is_first_player_summon: bool = true

## Cartas do campo do jogador marcadas pra atacar nesse turno — só existe
## durante a fase PlayerSummon; é finalizado em declared_attackers quando
## ela termina (ver _on_player_summon_exited).
var _selected_attackers: Array[CardInvocada] = []

var _current_enemy_attackers: Array[CardInvocada] = []
## Bloqueadora sendo "armada" pelo clique do jogador; o próximo clique num
## atacante inimigo a associa a ele (ver _on_player_blocker_clicked).
var _pending_blocker: CardInvocada = null

var _inicial_combat : bool = true


func _ready() -> void:
	state_player_summon.state_entered.connect(_on_player_summon_entered)
	state_player_summon.state_exited.connect(_on_player_summon_exited)

	state_enemy_defends.state_entered.connect(_on_enemy_defends_entered)
	state_resolve_damage_player.state_entered.connect(_on_resolve_damage_player_entered)
	state_enemy_invocation.state_entered.connect(_on_enemy_invocation_entered)
	state_enemy_choose_attacker.state_entered.connect(_on_enemy_choose_attacker_entered)
	state_player_defends.state_entered.connect(_on_player_defends_entered)
	state_resolve_damage_enemy.state_entered.connect(_on_resolve_damage_enemy_entered)

	end_turn_button.pressed.connect(_on_end_turn_button_pressed)
	confirm_defense_button.pressed.connect(_on_confirm_defense_pressed)

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


#region Invocação + seleção de atacantes do jogador (fase única)
func _on_player_summon_entered() -> void:
	is_player_summon_phase = true
	blood_manager.start_turn(_inicial_combat)
	_reset_turn_flags(player_field)

	if _is_first_player_summon:
		_is_first_player_summon = false
	else:
		_draw_card_for_turn()

	player_hand.set_interactive(true)
	end_turn_button.visible = true
	phase_label.text = "Invocação e Ataque:\nJogador"

	_selected_attackers.clear()
	for card in player_field.get_children():
		if card is CardInvocada:
			_watch_field_card_for_attack(card)

	# Cartas invocadas durante esta mesma fase (ex.: uma com "Passo
	# Rápido", que nasce sem doença de invocação) também precisam poder
	# ser marcadas como atacantes, não só as que já estavam no campo.
	player_field.child_entered_tree.connect(_on_player_field_child_entered)


## Compra 1 carta do baralho do jogador pra mão. Se o baralho (e o
## descarte) estiverem totalmente vazios, DeckResource.draw_card() retorna
## null e simplesmente não compra nada.
func _draw_card_for_turn() -> void:
	if not duel_scene.player_deck_data:
		return
	var card_data := duel_scene.player_deck_data.draw_card()
	if card_data:
		player_hand.add_card_to_hand(card_data)
	duel_scene.update_deck_counts()


## child_entered_tree dispara durante o próprio add_child(), antes de
## card_data ser atribuído (e portanto antes de is_summoning_sick ser
## corrigido por CardInvocada.update_visuals) — adia a checagem pro fim
## do frame, quando a carta já está totalmente montada.
func _on_player_field_child_entered(node: Node) -> void:
	if node is CardInvocada:
		_watch_field_card_for_attack.call_deferred(node)


## Conecta (ou não) uma carta do campo à seleção de atacante conforme sua
## elegibilidade atual, e atualiza o TimeoutIndicador dela.
func _watch_field_card_for_attack(card: CardInvocada) -> void:
	if not is_instance_valid(card) or not is_player_summon_phase:
		return

	var can_attack_now: bool = card.can_attack()
	card.set_selectable(can_attack_now)
	if can_attack_now and not card.card_invocada_clicked.is_connected(_on_player_field_card_clicked):
		card.card_invocada_clicked.connect(_on_player_field_card_clicked)


func _on_player_field_card_clicked(card: CardInvocada, button_index: int) -> void:
	if button_index != MOUSE_BUTTON_LEFT:
		return

	if card.is_selected:
		card.set_selected(false)
		_selected_attackers.erase(card)
	else:
		card.set_selected(true)
		_selected_attackers.append(card)


## Fim da fase: o que estiver marcado em _selected_attackers vira o
## ataque declarado do turno, e o campo volta ao estado neutro antes de
## entrar em combate.
func _on_player_summon_exited() -> void:
	_inicial_combat = false
	is_player_summon_phase = false
	player_hand.set_interactive(false)
	end_turn_button.visible = false

	if player_field.child_entered_tree.is_connected(_on_player_field_child_entered):
		player_field.child_entered_tree.disconnect(_on_player_field_child_entered)

	for card in player_field.get_children():
		if card is CardInvocada and card.card_invocada_clicked.is_connected(_on_player_field_card_clicked):
			card.card_invocada_clicked.disconnect(_on_player_field_card_clicked)

	for card in _selected_attackers:
		card.has_attacked_this_turn = true
		card.set_selected(false)

	_hide_all_indicators(player_field)

	combat_manager.declared_attackers = _selected_attackers.duplicate()
	_selected_attackers.clear()
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

	for card in enemy_field.get_children():
		if card is CardInvocada:
			card.set_selectable(card.can_attack())

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
## bloqueadoras pendentes em sequência e se acumular no mesmo atacante,
## até o limite de CardResource.max_blockers dele.
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


## Clique num atacante inimigo: associa a bloqueadora pendente a ele, até
## o limite de CardResource.max_blockers do atacante (padrão 1 — cartas
## com o limite maior podem ser cercadas por mais bloqueadoras). Atacantes
## com a habilidade "Voar" só podem ser bloqueados por cartas com "Voar"
## ou "Alcance".
func _on_enemy_attacker_clicked(card: CardInvocada, button_index: int) -> void:
	if button_index != MOUSE_BUTTON_LEFT:
		return
	if not _pending_blocker:
		return

	if card.has_ability("voar") and not (_pending_blocker.has_ability("voar") or _pending_blocker.has_ability("alcance")):
		return

	var current_blockers: Array = combat_manager.blocks.get(card, [])
	var limit: int = card.card_data.max_blockers if card.card_data else 1
	if current_blockers.size() >= limit:
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
	_hide_all_indicators(enemy_field)

	await combat_manager.resolve(false)

	if had_attackers:
		await get_tree().create_timer(stub_phase_delay).timeout
	duel_state_chart.send_event("damage_resolved")
#endregion
