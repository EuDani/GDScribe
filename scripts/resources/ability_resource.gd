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
## Emoji que representa a habilidade nos botões skill1/2/3 do preview e no
## texto montado em Hud/label_skill_details ("{icon_emoji} {ability_name}: {description}").
@export var icon_emoji: String = "❓"

@export_group("Execução")
## Determina quando/como a habilidade é disparada. String livre por
## enquanto (sem enum, pra não travar a criação de novas habilidades antes
## do motor de execução existir), mas os valores usados na biblioteca em
## resources/abilities/ seguem este vocabulário:
## - "ON_PLAY": ao ser invocada em campo
## - "ON_HIT": ao ser atingida em combate
## - "ON_ATTACK": ao atacar
## - "ON_DEATH": ao morrer (por qualquer causa)
## - "ON_ALLY_DEATH": quando outra carta sua morre em combate
## - "ON_SACRIFICE": ao ser sacrificada pelo barril de Sangue
## - "ON_DRAW": ao ser comprada do baralho
## - "ON_TURN_START": no início do turno do dono
## - "ON_SURVIVE_TURN": ao sobreviver um turno inteiro em campo
## - "PASSIVE_STATIC": efeito permanente, sem gatilho pontual (ex.: Voar,
##   Liderança) — vale enquanto a carta estiver viva/em campo
@export var trigger_type: String = "ON_PLAY"
