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

## Estado de combate "atual" desta cópia em campo, separado dos valores
## impressos em card_data (que continuam intactos — o mesmo CardResource
## pode voltar pra mão/baralho depois e não deve carregar dano residual).
## Inicializados a partir de card_data assim que ela é atribuída
## (ver update_visuals) e só modificados por CombatManager a partir daí.
var current_defense: int = 1
var current_shield: int = 0
var current_horde: int = 0

## Selo grande sobre a carta indicando que ela não pode ser escolhida na
## fase de combate atual (nem como atacante, nem como bloqueadora).
@onready var timeout_indicator: Label = $CardViewport/CardUI/TimeoutIndicador


func _ready() -> void:
	super._ready()
	card_area.input_event.connect(_on_input_event)
	_base_scale = scale
	if timeout_indicator:
		timeout_indicator.visible = false


## Além do preenchimento visual herdado, aplica a regra especial de cartas
## com a habilidade "Passo Rápido" (CardResource.can_attack_on_turn_created):
## essas nascem sem doença de invocação e já podem atacar no turno em que
## foram invocadas. Também inicializa o estado de combate "atual" (Defesa,
## Escudo, Horda) a partir dos valores impressos em card_data.
func update_visuals() -> void:
	super.update_visuals()
	if card_data:
		is_summoning_sick = not card_data.can_attack_on_turn_created
		current_defense = card_data.defense
		current_shield = card_data.shild
		current_horde = card_data.horde
		refresh_stat_labels()


## Consulta rápida se esta carta possui uma habilidade específica.
func has_ability(ability_id: String) -> bool:
	return card_data != null and card_data.has_ability(ability_id)


## Atualiza o texto de Defesa na carta pra refletir current_defense (o
## dano acumulado em combate) em vez do valor impresso original.
func refresh_stat_labels() -> void:
	if defense_label:
		defense_label.text = str(current_defense)


## Regra de elegibilidade para ser escolhida como atacante nesta fase de
## combate: precisa ter passado por pelo menos um início de turno do dono
## desde que foi invocada, ainda não ter atacado neste turno, e ter Ataque
## maior que 0 (cartas com 0 de Ataque não têm o que causar de dano).
func can_attack() -> bool:
	var has_attack: bool = card_data != null and card_data.attack > 0
	return not is_summoning_sick and not has_attacked_this_turn and has_attack


## Regra de elegibilidade para ser escolhida como bloqueadora: qualquer
## carta que não tenha atacado neste turno (a doença de invocação não
## impede bloquear, só atacar).
func can_block() -> bool:
	return not has_attacked_this_turn


## Mostra/esconde o TimeoutIndicador. Chamado pelo TurnManager ao entrar
## numa fase de seleção (atacantes ou bloqueadores), uma vez por carta do
## campo, com o resultado de can_attack()/can_block() conforme a fase.
func set_selectable(selectable: bool) -> void:
	if timeout_indicator:
		timeout_indicator.visible = not selectable


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
