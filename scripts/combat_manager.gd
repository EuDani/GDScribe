## Resolve o combate: aplica dano do atacante às bloqueadoras designadas
## (reduzindo Escudo e depois Defesa, respeitando Horda) ou ao castelo
## quando não há bloqueio — o atacante nunca sofre dano no bloqueio.
## Também cuida da apresentação: linhas conectando atacante e bloqueadoras,
## e o tween de investida antes de aplicar o dano de verdade.
class_name CombatManager
extends Node

## Pequeno recuo antes da investida (anticipation) — dá "peso" ao golpe em
## vez de um movimento único e mecânico.
const ATTACK_ANTICIPATION_TIME: float = 0.08
const ATTACK_ANTICIPATION_RATIO: float = 0.12
## Investida propriamente dita, com leve overshoot (TRANS_BACK) simulando
## o impulso do golpe.
const ATTACK_LUNGE_TIME: float = 0.12
const ATTACK_LUNGE_RATIO: float = 0.55
## Pausa breve no instante do impacto antes de recuar — um "frame de
## impacto" que dá tempo do olho registrar o golpe.
const ATTACK_IMPACT_HOLD_TIME: float = 0.05
const ATTACK_RETURN_TIME: float = 0.18
const ATTACK_TOTAL_TIME: float = ATTACK_ANTICIPATION_TIME + ATTACK_LUNGE_TIME + ATTACK_IMPACT_HOLD_TIME + ATTACK_RETURN_TIME

## Squash-and-stretch aplicado na(s) bloqueadora(s) no instante do impacto.
const IMPACT_SQUASH_SCALE: Vector3 = Vector3(1.22, 0.8, 1.22)
const IMPACT_SQUASH_TIME: float = 0.07
const IMPACT_RECOVER_TIME: float = 0.16

## Emitido uma única vez quando a vida de um dos lados chega a 0.
signal game_over(player_won: bool)

@export var starting_hp: int = 20

var _game_over_triggered: bool = false

## Preenchidos pelo TurnManager antes de chamar resolve(). Cada atacante
## pode ter várias bloqueadoras associadas (bloqueio em grupo) — lista
## vazia ou ausente do dicionário significa "não bloqueado".
var declared_attackers: Array[CardInvocada] = []
var blocks: Dictionary = {}  # CardInvocada (atacante) -> Array[CardInvocada] (bloqueadoras)

var player_hp: int = 20
var enemy_hp: int = 20

## Linhas 3D atualmente desenhadas, indexadas pelo atacante dono delas.
var _attack_lines: Dictionary = {}  # CardInvocada -> Array[AttackLine]

@onready var duel_scene: DuelScene = $".."
@onready var player_hp_label: Label = $"../Hud/PlayerHpLabel"
@onready var enemy_hp_label: Label = $"../Hud/EnemyHpLabel"


func _ready() -> void:
	player_hp = starting_hp
	enemy_hp = starting_hp
	_update_labels()


## attacker_is_player indica de quem é o ataque sendo resolvido, para saber
## qual campo defende, qual castelo recebe dano não bloqueado e em direção
## a qual HandAnchor os ataques desbloqueados avançam.
func resolve(attacker_is_player: bool) -> void:
	var blocker_field: Node3D = duel_scene.enemy_field if attacker_is_player else duel_scene.player_field
	var unblocked_target: Node3D = duel_scene.enemy_hand if attacker_is_player else duel_scene.player_hand

	await _animate_attacks(unblocked_target)

	for attacker: CardInvocada in declared_attackers:
		if not is_instance_valid(attacker):
			continue

		var blockers := _valid_blockers(attacker)
		if blockers.is_empty():
			var damage: int = attacker.card_data.attack
			if attacker_is_player:
				enemy_hp = maxi(enemy_hp - damage, 0)
			else:
				player_hp = maxi(player_hp - damage, 0)
				# Feedback de impacto só quando é o jogador quem leva o
				# golpe direto na vida (ataque inimigo não bloqueado).
				if duel_scene.main_camera:
					duel_scene.main_camera.shake(clampf(damage * 0.15, 0.25, 0.9))
			continue

		# Cada bloqueadora escalada sofre o ataque cheio (não é dividido
		# entre elas) — bloqueio em grupo serve pra atender max_blockers
		# de cartas grandes, não pra "diluir" o dano.
		for blocker in blockers:
			_apply_damage(blocker, attacker.card_data.attack, blocker_field)

	clear_attack_lines()
	duel_scene.reorganize_field(blocker_field, duel_scene.field_card_spacing)
	_update_labels()
	_check_game_over()

	declared_attackers.clear()
	blocks.clear()


## Dispara game_over uma única vez assim que um dos lados chega a 0 de
## vida. Prioriza o jogador "perdendo" se, por algum motivo, ambos
## chegarem a 0 ao mesmo tempo.
func _check_game_over() -> void:
	if _game_over_triggered:
		return
	if player_hp <= 0:
		_game_over_triggered = true
		game_over.emit(false)
	elif enemy_hp <= 0:
		_game_over_triggered = true
		game_over.emit(true)


## Aplica `amount` de dano a `target`: se ela tiver Escudo (current_shield
## > 0), o Escudo absorve o golpe inteiro (perde valor, mas a Defesa não é
## tocada) e o bloqueio conta como bem-sucedido de qualquer forma. Senão o
## dano sai da Defesa; se ela zerar, uma Horda disponível (current_horde >
## 0) consome 1 de horda e reinicia a Defesa em vez de morrer — só quando
## a horda também acaba é que a carta é destruída de verdade.
func _apply_damage(target: CardInvocada, amount: int, field: Node3D) -> void:
	if target.current_shield > 0:
		target.current_shield = maxi(target.current_shield - amount, 0)
		target.refresh_stat_labels()
		return

	target.current_defense -= amount
	if target.current_defense > 0:
		target.refresh_stat_labels()
		return

	if target.current_horde > 0:
		target.current_horde -= 1
		target.current_defense = target.card_data.defense
		target.refresh_stat_labels()
		return

	field.remove_child(target)
	target.queue_free()


## Redesenha todas as linhas de ataque->bloqueadora a partir do estado
## atual de `blocks`. Chamado tanto pela IA (EnemyDefends) quanto pela UI
## de defesa manual do jogador (a cada clique que muda um pareamento).
func refresh_attack_lines() -> void:
	clear_attack_lines()
	for attacker: CardInvocada in blocks.keys():
		if not is_instance_valid(attacker):
			continue
		var lines: Array[AttackLine] = []
		for blocker: CardInvocada in _valid_blockers(attacker):
			var line := AttackLine.new()
			add_child(line)
			line.point_between(attacker.global_position, blocker.global_position)
			lines.append(line)
		if not lines.is_empty():
			_attack_lines[attacker] = lines


func clear_attack_lines() -> void:
	for lines: Array in _attack_lines.values():
		for line: AttackLine in lines:
			if is_instance_valid(line):
				line.queue_free()
	_attack_lines.clear()


## Retorna as bloqueadoras de `attacker` já filtradas de instâncias
## inválidas (mortas por outro motivo entre a designação e a resolução).
func _valid_blockers(attacker: CardInvocada) -> Array[CardInvocada]:
	var raw: Array = blocks.get(attacker, [])
	var valid: Array[CardInvocada] = []
	for blocker in raw:
		if blocker is CardInvocada and is_instance_valid(blocker):
			valid.append(blocker)
	return valid


## Anima cada atacante recuando (antecipação), avançando com impulso até a
## primeira bloqueadora (ou até o HandAnchor do lado oposto, se não houver
## bloqueio), segurando um instante no impacto e voltando pro lugar — tudo
## antes do dano de verdade ser calculado em resolve(). A bloqueadora
## atingida reage com um squash-and-stretch no momento do impacto.
func _animate_attacks(unblocked_target: Node3D) -> void:
	var any_attacker := false

	for attacker: CardInvocada in declared_attackers:
		if not is_instance_valid(attacker):
			continue

		var blockers := _valid_blockers(attacker)
		var target_pos: Vector3 = blockers[0].global_position if not blockers.is_empty() else unblocked_target.global_position

		var original_pos := attacker.global_position
		var anticipation_pos := original_pos.lerp(target_pos, -ATTACK_ANTICIPATION_RATIO)
		var lunge_pos := original_pos.lerp(target_pos, ATTACK_LUNGE_RATIO)

		var tween := create_tween()
		tween.tween_property(attacker, "global_position", anticipation_pos, ATTACK_ANTICIPATION_TIME) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		tween.tween_property(attacker, "global_position", lunge_pos, ATTACK_LUNGE_TIME) \
			.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.tween_callback(_play_impact_squash.bind(blockers))
		tween.tween_interval(ATTACK_IMPACT_HOLD_TIME)
		tween.tween_property(attacker, "global_position", original_pos, ATTACK_RETURN_TIME) \
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

		any_attacker = true

	if any_attacker:
		await get_tree().create_timer(ATTACK_TOTAL_TIME).timeout


## Squash rápido seguido de retorno elástico nas bloqueadoras — feedback
## visual de "levou o golpe" no instante exato em que o atacante conecta.
func _play_impact_squash(blockers: Array[CardInvocada]) -> void:
	for blocker in blockers:
		if not is_instance_valid(blocker):
			continue
		var base_scale: Vector3 = blocker.scale
		var squash_tween := create_tween()
		squash_tween.tween_property(blocker, "scale", base_scale * IMPACT_SQUASH_SCALE, IMPACT_SQUASH_TIME) \
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		squash_tween.tween_property(blocker, "scale", base_scale, IMPACT_RECOVER_TIME) \
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)


func _update_labels() -> void:
	if player_hp_label:
		player_hp_label.text = str(player_hp)
	if enemy_hp_label:
		enemy_hp_label.text = str(enemy_hp)
