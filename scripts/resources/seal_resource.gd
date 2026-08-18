## Dados de um Selo: um modificador que pode ser aplicado a uma carta (via
## CardResource.seal), alterando seus atributos de combate ou comportamento.
## Cada carta pode ter no máximo 1 Selo ativo por vez.
class_name SealResource
extends Resource

@export_group("Identificação do Selo")
@export var id: String = ""
@export var seal_name: String = "Novo Selo"
@export_multiline var description: String = ""
@export var seal_icon: Texture2D

@export_group("Modificadores e Regras")
## Modificadores diretos (pode alterar ataque/defesa ou comportamento da carta)
## Bônus e penalidades são independentes (nada impede configurar os dois ao
## mesmo tempo); cabe a quem aplica o Selo decidir a combinação desejada.
@export var bonus_attack: int = 0
@export var bonus_defense: int = 0
@export var penalty_attack: int = 0
@export var penalty_defense: int = 0
