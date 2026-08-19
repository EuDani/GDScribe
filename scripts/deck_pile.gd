## Pilha visual de um monte de compra (jogador ou oponente): sprites de
## costas empilhadas, sem dados — só a representação física do baralho.
## A quantidade de sprites acompanha dinamicamente o tamanho real do
## baralho, adicionando ou removendo conforme ele diminui (ver
## DuelScene.update_deck_counts(), chamada sempre que alguém compra).
class_name DeckPile
extends Area3D

@export var card_back_texture: Texture2D = preload("res://sprites/card_back.png")
## Espaçamento vertical entre cada carta empilhada.
@export var card_spacing: float = 0.05135
## Altura Y da carta mais no fundo da pilha.
@export var base_y: float = -0.081

var _sprites: Array[Sprite3D] = []


## Ajusta a quantidade de sprites da pilha pra bater com `count` — usado
## tanto pra montagem inicial (baralho cheio) quanto pra cada compra.
func set_card_count(count: int) -> void:
	while _sprites.size() < count:
		_sprites.append(_spawn_card_back())
	while _sprites.size() > count:
		var sprite: Sprite3D = _sprites.pop_back()
		sprite.queue_free()
	_reposition()


func _spawn_card_back() -> Sprite3D:
	var sprite := Sprite3D.new()
	sprite.texture = card_back_texture
	sprite.rotation_degrees = Vector3(-90.0, 0.0, 0.0)
	sprite.scale = Vector3(0.4, 0.4, 0.4)
	add_child(sprite)
	return sprite


func _reposition() -> void:
	for i in range(_sprites.size()):
		var sprite := _sprites[i]
		sprite.position = Vector3(0.0, base_y + i * card_spacing, 0.0)
