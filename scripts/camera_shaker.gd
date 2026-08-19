## Tremor de câmera (screen shake) usado como feedback de impacto — hoje,
## principalmente quando o jogador é atingido diretamente na vida (ataque
## não bloqueado chegando no castelo). Desloca h_offset/v_offset (a "lente"
## do Camera3D) em vez do transform real, então não interfere com nada que
## dependa da posição/orientação da câmera (raycasts de arraste, etc).
class_name CameraShaker
extends Camera3D

## Velocidade com que o trauma (força do tremor) decai por segundo.
@export var shake_decay: float = 4.0
## Deslocamento máximo de lente no auge do tremor.
@export var max_offset: float = 0.06
@export var noise_frequency: float = 6.0

var _trauma: float = 0.0
var _noise := FastNoiseLite.new()
var _noise_time: float = 0.0


func _ready() -> void:
	_noise.seed = randi()
	_noise.frequency = noise_frequency
	set_process(false)


func _process(delta: float) -> void:
	if _trauma <= 0.0:
		h_offset = 0.0
		v_offset = 0.0
		set_process(false)
		return

	_trauma = maxf(_trauma - shake_decay * delta, 0.0)
	# Falloff quadrático: sacode forte no impacto e amortece rápido no final,
	# em vez de um tremor linear que "esvazia" de forma perceptível.
	var amount := _trauma * _trauma

	_noise_time += delta * 25.0
	h_offset = max_offset * amount * _noise.get_noise_2d(_noise_time, 0.0)
	v_offset = max_offset * amount * _noise.get_noise_2d(100.0, _noise_time)


## Adiciona trauma (força do tremor), acumulando até o teto de 1.0 —
## chamadas repetidas em sequência intensificam o tremor em vez de reiniciá-lo.
func shake(trauma_amount: float = 0.4) -> void:
	_trauma = clampf(_trauma + trauma_amount, 0.0, 1.0)
	set_process(true)
