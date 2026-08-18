class_name GeneralResource
extends Resource

@export_group("Identificação do General")
@export var id: String = ""
@export var general_name: String = "General"
@export_multiline var passive_description: String = ""
@export var portrait: Texture2D

@export_group("Regras e Custos")
## Custo em Sangue para ativar a habilidade do General (se for uma habilidade ativa)
@export var activation_cost: int = 0:
	set(value):
		activation_cost = clampi(value, 0, 10)

## Se verdadeiro, o efeito é passivo e não precisa de clique para ativar
@export var is_passive: bool = true
