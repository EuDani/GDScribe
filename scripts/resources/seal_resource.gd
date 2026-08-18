class_name SealResource
extends Resource

@export_group("Identificação do Selo")
@export var id: String = ""
@export var seal_name: String = "Novo Selo"
@export_multiline var description: String = ""
@export var seal_icon: Texture2D

@export_group("Modificadores e Regras")
## Modificadores diretos (pode alterar ataque/defesa ou comportamento da carta)
@export var bonus_attack: int = 0
@export var bonus_defense: int = 0
@export var penalty_attack: int = 0
@export var penalty_defense: int = 0
