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

## Squash-and-stretch aplicado na(s) bloqueadora(s) no instante do impacto.
const IMPACT_SQUASH_SCALE: Vector3 = Vector3(1.22, 0.8, 1.22)
const IMPACT_SQUASH_TIME: float = 0.07
const IMPACT_RECOVER_TIME: float = 0.16

## Punch + shake nos HpLabel quando um lado leva dano direto na vida
## (ataque não bloqueado).
const HP_HIT_PUNCH_SCALE: float = 1.4
const HP_HIT_PUNCH_TIME: float = 0.12
const HP_HIT_RECOVER_TIME: float = 0.25
const HP_HIT_SHAKE_OFFSET: float = 6.0
const HP_HIT_SHAKE_STEPS: int = 4
const HP_HIT_SHAKE_STEP_TIME: float = 0.04

## O label de vida vai ficando maior e mais vermelho conforme a vida se
## aproxima de 0 (100% de vida = escala/cor normais).
const HP_LOW_SCALE: float = 1.6
const HP_LOW_COLOR: Color = Color(1.0, 0.15, 0.15, 1.0)
const HP_FULL_COLOR: Color = Color(1.0, 1.0, 1.0, 1.0)

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

## Dano não bloqueado sofrido/causado no último ataque de cada lado —
## consultado pela personalidade Vingativo do oponente (ver
## EnemyAiController._compute_attack_share) pra ficar mais agressivo
## quando apanhou e mais comedido quando acertou o jogador.
var last_enemy_hp_lost: int = 0
var last_player_hp_lost_by_enemy: int = 0

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
## a qual HandAnchor os ataques desbloqueados avançam. Quando há vários
## atacantes declarados, cada um ataca (anima + causa dano) por completo
## antes do próximo começar — uma cadeia, não tudo de uma vez — tanto pro
## jogador quanto pro oponente.
func resolve(attacker_is_player: bool) -> void:
	var blocker_field: Node3D = duel_scene.enemy_field if attacker_is_player else duel_scene.player_field
	var attacker_field: Node3D = duel_scene.player_field if attacker_is_player else duel_scene.enemy_field
	var unblocked_target: Node3D = duel_scene.enemy_hand if attacker_is_player else duel_scene.player_hand

	if attacker_is_player:
		last_enemy_hp_lost = 0
	else:
		last_player_hp_lost_by_enemy = 0

	var player_hit := false
	var enemy_hit := false

	for attacker: CardInvocada in declared_attackers:
		if not is_instance_valid(attacker):
			continue

		var blockers := _valid_blockers(attacker)
		await _animate_single_attack(attacker, blockers, unblocked_target)

		if blockers.is_empty():
			var damage: int = attacker.card_data.attack
			if attacker_is_player:
				enemy_hp = maxi(enemy_hp - damage, 0)
				last_enemy_hp_lost += damage
				enemy_hit = true
			else:
				if not CheatCodes.infinite_life:
					player_hp = maxi(player_hp - damage, 0)
				last_player_hp_lost_by_enemy += damage
				player_hit = true
			# Feedback de impacto sempre que a vida de alguém é atingida
			# diretamente (ataque não bloqueado), de qualquer um dos lados.
			if duel_scene.main_camera:
				duel_scene.main_camera.shake(clampf(damage * 0.15, 0.25, 0.9))
		else:
			# Bloqueio corpo a corpo: cada bloqueadora escalada sofre o
			# ataque cheio da atacante (não é dividido entre elas —
			# bloqueio em grupo serve pra atender max_blockers de cartas
			# grandes, não pra "diluir" o dano) e revida com o próprio
			# ataque contra a atacante. Diferente de um ataque
			# desbloqueado, aqui os dois lados saem feridos.
			for blocker in blockers:
				# Bloqueadora sofre o ataque da atacante...
				_apply_damage(blocker, attacker.card_data.attack, blocker_field)
				# ...e revida: a atacante sofre o ataque da bloqueadora de volta.
				if is_instance_valid(attacker):
					_apply_damage(attacker, blocker.card_data.attack, attacker_field)

		# Encerra a cadeia mais cedo se este golpe já decidiu o jogo — não
		# faz sentido continuar animando os atacantes restantes.
		_check_game_over()
		if _game_over_triggered:
			break

	clear_attack_lines()
	duel_scene.reorganize_field(blocker_field, duel_scene.field_card_spacing)
	duel_scene.reorganize_field(attacker_field, duel_scene.field_card_spacing)
	_update_labels()

	# Dispara o punch/shake só depois de _update_labels() já ter aplicado a
	# escala/cor "de repouso" conforme a vida atual — assim a animação
	# soma em cima do estado certo, em vez de brigar com ele.
	if player_hit:
		_punch_hp_label(player_hp_label)
	if enemy_hit:
		_punch_hp_label(enemy_hp_label)

	declared_attackers.clear()
	blocks.clear()


## Dispara game_over uma única vez assim que um dos lados chega a 0 de
## vida. Prioriza o jogador "perdendo" se, por algum motivo, ambos
## chegarem a 0 ao mesmo tempo.
func _check_game_over() -> void:
	if player_hp <= 0:
		force_game_over(false)
	elif enemy_hp <= 0:
		force_game_over(true)


## Fim de jogo sem depender da vida chegar a 0 — usado pela desistência da
## personalidade Diplomata do oponente (ver
## TurnManager._check_diplomata_surrender). Respeita a mesma trava de
## "só uma vez" que _check_game_over().
func force_game_over(player_won: bool) -> void:
	if _game_over_triggered:
		return
	_game_over_triggered = true
	game_over.emit(player_won)


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


## Anima um único atacante recuando (antecipação), avançando com impulso
## até a primeira bloqueadora (ou até o HandAnchor do lado oposto, se não
## houver bloqueio), segurando um instante no impacto e voltando pro
## lugar — antes do dano de verdade ser calculado em resolve(). A
## bloqueadora atingida reage com um squash-and-stretch no momento do
## impacto. resolve() chama isto uma vez por atacante, em sequência (await),
## formando a cadeia de ataques quando há mais de um atacante declarado.
func _animate_single_attack(attacker: CardInvocada, blockers: Array[CardInvocada], unblocked_target: Node3D) -> void:
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

	await tween.finished


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
	_style_hp_label(player_hp_label, player_hp)
	_style_hp_label(enemy_hp_label, enemy_hp)


## Atualiza o texto e a aparência "de repouso" do label conforme a vida
## atual: fica maior e mais vermelho quanto mais perto de 0 (100% de vida
## = escala/cor normais).
func _style_hp_label(label: Label, hp: int) -> void:
	if not label:
		return

	label.text = str(hp)

	var ratio := clampf(float(hp) / float(maxi(starting_hp, 1)), 0.0, 1.0)
	var urgency := 1.0 - ratio

	label.add_theme_color_override("font_color", HP_FULL_COLOR.lerp(HP_LOW_COLOR, urgency))
	label.scale = Vector2.ONE * lerpf(1.0, HP_LOW_SCALE, urgency)


## Punch de escala (com overshoot elástico) + alguns passos de shake de
## posição — feedback de "a vida foi atingida direto" nos HpLabel. A
## escala de repouso (já ajustada por _style_hp_label conforme a vida
## atual) é preservada: o punch soma em cima dela, não a substitui.
func _punch_hp_label(label: Label) -> void:
	if not label:
		return

	var rest_scale := label.scale
	var rest_position := label.position

	var scale_tween := create_tween()
	scale_tween.tween_property(label, "scale", rest_scale * HP_HIT_PUNCH_SCALE, HP_HIT_PUNCH_TIME) \
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	scale_tween.tween_property(label, "scale", rest_scale, HP_HIT_RECOVER_TIME) \
		.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)

	var shake_tween := create_tween()
	for i in range(HP_HIT_SHAKE_STEPS):
		var offset := Vector2(
			randf_range(-HP_HIT_SHAKE_OFFSET, HP_HIT_SHAKE_OFFSET),
			randf_range(-HP_HIT_SHAKE_OFFSET, HP_HIT_SHAKE_OFFSET)
		)
		shake_tween.tween_property(label, "position", rest_position + offset, HP_HIT_SHAKE_STEP_TIME)
	shake_tween.tween_property(label, "position", rest_position, HP_HIT_SHAKE_STEP_TIME)
