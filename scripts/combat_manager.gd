## Resolve o combate: aplica o resultado dos pareamentos atacante/bloqueadoras
## declarados na fase de combate atual (dano ao castelo quando não há
## bloqueio, ou morte das bloqueadoras — o atacante nunca morre no bloqueio).
## Também cuida da apresentação: linhas conectando atacante e bloqueadoras,
## e o tween de investida antes de aplicar o dano de verdade.
class_name CombatManager
extends Node

const ATTACK_LUNGE_TIME: float = 0.15
const ATTACK_LUNGE_RATIO: float = 0.5

@export var starting_hp: int = 20

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
@onready var player_hp_label: Label3D = $"../PlayerCastle/HPLabel"
@onready var enemy_hp_label: Label3D = $"../EnemyCastle/HPLabel"


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
			continue

		# O ataque "atravessa" as bloqueadoras na ordem em que foram
		# associadas: cada uma morre se o que sobrou de força do ataque
		# for maior que a Defesa dela, consumindo essa força; o resto (se
		# houver) segue pra próxima. O atacante nunca morre no bloqueio.
		var remaining_attack: int = attacker.card_data.attack
		for blocker: CardInvocada in blockers:
			if remaining_attack <= 0:
				break
			if remaining_attack > blocker.card_data.defense:
				remaining_attack -= blocker.card_data.defense
				blocker_field.remove_child(blocker)
				blocker.queue_free()
			else:
				remaining_attack = 0

	clear_attack_lines()
	duel_scene.reorganize_field(blocker_field, duel_scene.field_card_spacing)
	_update_labels()

	declared_attackers.clear()
	blocks.clear()


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


## Anima cada atacante avançando até a primeira bloqueadora (ou até o
## HandAnchor do lado oposto, se não houver bloqueio) e voltando pro
## lugar, antes do dano de verdade ser calculado em resolve().
func _animate_attacks(unblocked_target: Node3D) -> void:
	var any_attacker := false

	for attacker: CardInvocada in declared_attackers:
		if not is_instance_valid(attacker):
			continue

		var blockers := _valid_blockers(attacker)
		var target_pos: Vector3 = blockers[0].global_position if not blockers.is_empty() else unblocked_target.global_position

		var original_pos := attacker.global_position
		var lunge_pos := original_pos.lerp(target_pos, ATTACK_LUNGE_RATIO)

		var tween := create_tween()
		tween.tween_property(attacker, "global_position", lunge_pos, ATTACK_LUNGE_TIME)
		tween.tween_property(attacker, "global_position", original_pos, ATTACK_LUNGE_TIME)
		any_attacker = true

	if any_attacker:
		await get_tree().create_timer(ATTACK_LUNGE_TIME * 2.0).timeout


func _update_labels() -> void:
	if player_hp_label:
		player_hp_label.text = str(player_hp)
	if enemy_hp_label:
		enemy_hp_label.text = str(enemy_hp)
