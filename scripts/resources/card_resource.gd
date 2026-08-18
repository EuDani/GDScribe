## Dados de uma carta do jogo: tudo que a define fora da partida (nome,
## arte, custo, atributos de combate, habilidades). Uma instância deste
## recurso representa a "carta impressa"; DeckResource.initialize_deck()
## duplica cada uma para gerar as cópias usadas durante a partida.
class_name CardResource
extends Resource

## Categorias de identificação das cartas (Para fins de lore, organização e regras específicas)
enum CardCategory {
	SOLDADO,     ## Humanos e pessoas muito habilidosas
	ESTRUTURA,   ## Construções e edificações no campo
	CRIATURA,    ## Monstros e seres mágicos
	AUTOMATO     ## Seres robóticos e metálicos
}

## Hierarquia de poder e raridade da carta
enum CardLevel {
	MADEIRA,
	PEDRA,
	FERRO,
	BRONZE,
	OURO,
	QUARTZO,
	ESMERALDA,
	DIAMANTE,
	OBSIDIANA
}

## Mapeamento de etiquetas legíveis para UI/Inspector
const LEVEL_LABELS: Dictionary = {
	CardLevel.MADEIRA: "Madeira",
	CardLevel.PEDRA: "Pedra",
	CardLevel.FERRO: "Ferro",
	CardLevel.BRONZE: "Bronze",
	CardLevel.OURO: "Ouro",
	CardLevel.QUARTZO: "Quartzo",
	CardLevel.ESMERALDA: "Esmeralda",
	CardLevel.DIAMANTE: "Diamante",
	CardLevel.OBSIDIANA: "Obsidiana"
}

@export_group("Identificação Básica")
## Identificador único e estável da carta, independente do nome exibido
## (útil para referenciar a carta por código sem depender de texto).
@export var id: String = ""
@export var card_name: String = "Nova Carta"
@export_multiline var description: String = ""
@export var artwork: Texture2D

@export_group("Classificação e Nível")
## Define o nível de poder da carta (da Madeira até a Obsidiana)
@export var level: CardLevel = CardLevel.MADEIRA

## Categoria da carta (Soldado, Estrutura, Criatura ou Autômato)
@export var category: CardCategory = CardCategory.SOLDADO

## Se verdadeiro, a carta é um Efeito: uma ação instantânea/feitiço que se
## resolve na hora e não permanece como unidade no campo (diferente de uma
## carta normal, que fica invocada até morrer).
@export var is_effect: bool = false

@export_group("Atributos de Combate")
## Custo em Sangue para invocar/ativar esta carta.
@export var blood_cost: int = 1:
	set(value):
		blood_cost = clampi(value, 0, 10)

@export var attack: int = 1:
	set(value):
		attack = maxi(value, 0)

@export var defense: int = 1:
	set(value):
		defense = maxi(value, 0)

@export_group("Habilidades e Selos")
## Lista de habilidades ativas ou passivas que esta carta possui
@export var abilities: Array[AbilityResource] = []

## A carta pode possuir NO MÁXIMO 1 Selo ativo por vez
@export var seal: SealResource = null

@export_group("Regras Especiais")
## Se verdadeiro, a carta pode atacar no mesmo turno em que é baixada
## (ignora a doença de invocação aplicada normalmente pelo TurnManager).
@export var can_attack_on_turn_created: bool = false
@export var shild: int = false
@export var horde: int = false

## Quantas cartas do oponente podem se juntar pra bloquear esta carta
## quando ela ataca. O padrão (1) é o normal: só 1 bloqueadora por vez.
## Valores maiores representam cartas grandes/perigosas o suficiente pra
## exigir que o oponente escale mais de uma carta pra segurá-las (ver
## TurnManager._on_enemy_attacker_clicked, que aplica esse limite).
@export var max_blockers: int = 1:
	set(value):
		max_blockers = maxi(value, 1)


## Função utilitária para pegar o texto do nível da carta em formato de String
func get_level_label() -> String:
	return LEVEL_LABELS.get(level, "Desconhecido")
