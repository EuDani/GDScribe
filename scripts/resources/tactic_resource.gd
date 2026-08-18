## Dados da Tática do baralho: a carta de comando/liderança que define a
## identidade estratégica do jogador na partida (não é uma carta de
## invocação nem de efeito — fica associada ao deck como um todo).
class_name TacticResource
extends Resource

@export_group("Identificação da Tática")
## Identificador único usado para referenciar esta tática por código
## (ex.: salvar/carregar progresso, comparar com IDs de conquistas etc).
@export var id: String = ""
@export var tactic_name: String = "Tática"
## Texto exibido na UI descrevendo o que a habilidade passiva/ativa faz.
@export_multiline var passive_description: String = ""
@export var portrait: Texture2D

@export_group("Regras e Custos")
## Custo em Sangue para ativar a habilidade da Tática (relevante apenas
## quando is_passive == false, isto é, quando a habilidade precisa ser
## acionada manualmente pelo jogador).
@export var activation_cost: int = 0:
	set(value):
		activation_cost = clampi(value, 0, 10)

## Se verdadeiro, o efeito é passivo e não precisa de clique para ativar
## (dispara sozinho conforme sua condição, ex.: início de turno).
@export var is_passive: bool = true
