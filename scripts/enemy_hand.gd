## Representação visual simples da mão do oponente: sprites viradas para
## baixo, posicionadas em leque, sem dados nem interatividade — as cartas
## reais ficam em EnemyAiController.hand_data.
class_name EnemyHand
extends Node3D

@export var card_back_texture: Texture2D = preload("res://sprites/card_back.png")
@export var card_spacing: float = 0.55
@export var fan_curve_strength: float = 0.05
@export var reorganize_anim_time: float = 0.25

var _card_sprites: Array[Sprite3D] = []


## Ajusta a quantidade de sprites exibidas para bater com o tamanho real
## da mão do oponente (chamado pelo EnemyAiController a cada mudança).
func set_card_count(count: int) -> void:
	while _card_sprites.size() < count:
		_card_sprites.append(_spawn_card_back())
	while _card_sprites.size() > count:
		var sprite: Sprite3D = _card_sprites.pop_back()
		sprite.queue_free()
	_reorganize()


## Remove e retorna o último sprite da mão sem destruí-lo nem reorganizar
## o resto — usado pra animar um sacrifício antes de liberar o sprite de
## verdade (ver EnemyAiController._sacrifice_cheapest_card). Chamar
## set_card_count() logo em seguida, com a contagem já reduzida, evita que
## ele tente remover mais um sprite por conta própria.
func pop_sprite() -> Sprite3D:
	if _card_sprites.is_empty():
		return null
	return _card_sprites.pop_back()


func _spawn_card_back() -> Sprite3D:
	var sprite := Sprite3D.new()
	sprite.texture = card_back_texture
	sprite.rotation_degrees = Vector3(-90.0, 0.0, 0.0)
	sprite.scale = Vector3(0.4, 0.4, 0.4)
	add_child(sprite)
	return sprite


func _reorganize() -> void:
	var count := _card_sprites.size()
	if count == 0:
		return

	var total_width := (count - 1) * card_spacing
	var start_x := -total_width / 2.0

	for i in range(count):
		var sprite := _card_sprites[i]
		var target_x: float = start_x + (i * card_spacing)
		var target_y: float = -absf(target_x) * fan_curve_strength
		var target_z: float = i * 0.02
		create_tween().tween_property(sprite, "position", Vector3(target_x, target_y, target_z), reorganize_anim_time) \
			.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
