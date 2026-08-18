## Dados de uma Habilidade: um efeito associado a uma carta (via
## CardResource.abilities) que dispara automaticamente conforme
## trigger_type. Ainda não existe um motor de execução que leia este
## recurso e aplique o efeito de fato — por enquanto é só o dado descritivo.
class_name AbilityResource
extends Resource

@export_group("Identificação da Habilidade")
@export var id: String = ""
@export var ability_name: String = "Nova Habilidade"
@export_multiline var description: String = ""
@export var icon: Texture2D

@export_group("Execução")
## Determina quando/como a habilidade é disparada (ex: ao entrar no campo, ao atacar, ao morrer, etc)
## String livre por enquanto; valores usados até agora seguem o padrão
## "ON_<EVENTO>" (ex.: "ON_PLAY" = ao ser invocada em campo).
@export var trigger_type: String = "ON_PLAY"
