## Representa uma carta já invocada em campo.
##
## Toda a lógica de preenchimento visual é herdada de CardVisualBase; esta
## classe adiciona o estado de combate (doença de invocação, se já atacou
## neste turno) e a interação de clique usada por TurnManager para
## selecionar atacantes e bloqueadores durante as fases de combate.
class_name CardInvocada
extends CardVisualBase

signal card_invocada_clicked(card_node: CardInvocada, button_index: int)

const SELECT_ANIM_TIME: float = 0.15
const SELECT_Y_OFFSET: float = 0.3
const SELECT_SCALE: float = 1.15

## Não pode atacar no turno em que foi invocada. TurnManager limpa essa
## flag para todas as cartas de um lado assim que o dono daquele campo
## começa seu próprio turno de novo (ver TurnManager._reset_turn_flags).
var is_summoning_sick: bool = true
## Se atacou neste turno, não pode ser usada como bloqueadora até o dono
## começar o próprio turno de novo (mesma janela de reset acima).
var has_attacked_this_turn: bool = false
## Destaque visual atual: true enquanto a carta está marcada como atacante
## selecionada (fase de seleção de ataque) ou como bloqueadora pendente
## (fase de defesa manual do jogador).
var is_selected: bool = false

## Guarda a escala "de repouso" da carta (já incluindo o *= 1.2 aplicado na
## invocação) para que set_selected() saiba pra qual escala voltar ao
## desmarcar, em vez de assumir Vector3.ONE.
var _base_scale: Vector3 = Vector3.ONE
var _select_tween: Tween


func _ready() -> void:
	super._ready()
	card_area.input_event.connect(_on_input_event)
	_base_scale = scale


## Regra de elegibilidade para ser escolhida como atacante nesta fase de
## combate: precisa ter passado por pelo menos um início de turno do dono
## desde que foi invocada, e ainda não ter atacado neste turno.
func can_attack() -> bool:
	return not is_summoning_sick and not has_attacked_this_turn


## Regra de elegibilidade para ser escolhida como bloqueadora: qualquer
## carta que não tenha atacado neste turno (a doença de invocação não
## impede bloquear, só atacar).
func can_block() -> bool:
	return not has_attacked_this_turn


## Destaque visual usado tanto para "selecionada como atacante" quanto para
## "selecionada como bloqueadora" — eleva e aumenta levemente a carta.
func set_selected(selected: bool) -> void:
	if is_selected == selected:
		return
	is_selected = selected

	if _select_tween and _select_tween.is_running():
		_select_tween.kill()

	var target_y: float = SELECT_Y_OFFSET if selected else 0.0
	var target_scale: Vector3 = _base_scale * SELECT_SCALE if selected else _base_scale

	_select_tween = create_tween().set_parallel(true)
	_select_tween.tween_property(self, "position:y", target_y, SELECT_ANIM_TIME)
	_select_tween.tween_property(self, "scale", target_scale, SELECT_ANIM_TIME)


## Repassa cliques na carta como o sinal card_invocada_clicked, que o
## TurnManager conecta/desconecta dinamicamente conforme a fase de combate
## atual (seleção de atacante, escolha de bloqueador, etc).
func _on_input_event(_camera: Node, event: InputEvent, _pos: Vector3, _normal: Vector3, _shape: int) -> void:
	if event is InputEventMouseButton and event.pressed:
		card_invocada_clicked.emit(self, event.button_index)
