class_name AbilityResource
extends Resource

@export_group("Identificação da Habilidade")
@export var id: String = ""
@export var ability_name: String = "Nova Habilidade"
@export_multiline var description: String = ""
@export var icon: Texture2D

@export_group("Execução")
## Determina quando/como a habilidade é disparada (ex: ao entrar no campo, ao atacar, ao morrer, etc)
@export var trigger_type: String = "ON_PLAY"
