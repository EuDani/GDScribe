## Resolve o combate: aplica o resultado dos pareamentos atacante/bloqueador
## declarados na fase de combate atual (dano ao castelo quando não há
## bloqueio, ou morte do bloqueador — o atacante nunca morre no bloqueio).
class_name CombatManager
extends Node

@export var starting_hp: int = 20

## Preenchidos pelo TurnManager antes de chamar resolve().
var declared_attackers: Array[CardInvocada] = []
var blocks: Dictionary = {}  # CardInvocada (atacante) -> CardInvocada (bloqueador) ou null

var player_hp: int = 20
var enemy_hp: int = 20

@onready var duel_scene: DuelScene = $".."
@onready var player_hp_label: Label3D = $"../PlayerCastle/HPLabel"
@onready var enemy_hp_label: Label3D = $"../EnemyCastle/HPLabel"


func _ready() -> void:
	player_hp = starting_hp
	enemy_hp = starting_hp
	_update_labels()


## attacker_is_player indica de quem é o ataque sendo resolvido, para saber
## qual campo defende e qual castelo recebe dano não bloqueado.
func resolve(attacker_is_player: bool) -> void:
	var blocker_field: Node3D = duel_scene.enemy_field if attacker_is_player else duel_scene.player_field

	for attacker: CardInvocada in declared_attackers:
		if not is_instance_valid(attacker):
			continue

		var blocker: CardInvocada = blocks.get(attacker)
		if blocker and is_instance_valid(blocker):
			if attacker.card_data.attack > blocker.card_data.defense:
				blocker_field.remove_child(blocker)
				blocker.queue_free()
		else:
			var damage: int = attacker.card_data.attack
			if attacker_is_player:
				enemy_hp = maxi(enemy_hp - damage, 0)
			else:
				player_hp = maxi(player_hp - damage, 0)

	duel_scene.reorganize_field(blocker_field, duel_scene.field_card_spacing)
	_update_labels()

	declared_attackers.clear()
	blocks.clear()


func _update_labels() -> void:
	if player_hp_label:
		player_hp_label.text = str(player_hp)
	if enemy_hp_label:
		enemy_hp_label.text = str(enemy_hp)
