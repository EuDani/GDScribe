## Linha 3D fina conectando duas posições do mundo — usada pelo
## CombatManager para mostrar qual carta atacante está pareada com qual
## bloqueadora durante a fase de defesa e a resolução de dano.
class_name AttackLine
extends MeshInstance3D

@export var thickness: float = 0.06
@export var line_color: Color = Color(0.85, 0.1, 0.1, 0.85)

var _box_mesh: BoxMesh


func _ready() -> void:
	_box_mesh = BoxMesh.new()
	mesh = _box_mesh

	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.albedo_color = line_color
	material_override = material


## Reposiciona, reorienta e reescala a caixa fina pra que ela vá exatamente
## de `from_pos` até `to_pos` em coordenadas globais.
func point_between(from_pos: Vector3, to_pos: Vector3) -> void:
	var diff := to_pos - from_pos
	var length := diff.length()

	global_position = (from_pos + to_pos) / 2.0
	_box_mesh.size = Vector3(thickness, thickness, length)

	if length > 0.001:
		look_at(to_pos, Vector3.UP)
