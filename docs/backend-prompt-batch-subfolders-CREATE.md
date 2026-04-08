# Backend — Novo Endpoint: `POST .../subfolders/batch`

## Contexto

O fluxo do professor para gerenciar subpastas de um perfil de nível foi
completamente revisado no front-end. Agora, o professor:

1. Cria N subpastas localmente (estado pendente)
2. Adiciona exercícios (`.docx` convertidos em HTML) e materiais (vídeo / link / documento) a cada subpasta pendente
3. Ao clicar em **"Salvar tudo"**, uma **única requisição** é feita para criar todas as subpastas, seus exercícios e seus materiais de uma vez
4. Opcionalmente, marca cada subpasta com `propagateToStudents: true` — quando ativado, **todos os alunos que já possuem aquele perfil de nível** recebem automaticamente uma cópia dessa subpasta (com seus exercícios e materiais) no workspace pessoal deles

---

## Endpoint

```
POST /level-profiles/:profileId/folders/:folderId/subfolders/batch
Authorization: Bearer <teacher-token>
Content-Type: application/json
```

> ⚠️ A rota deve ser registrada **antes** de `POST .../subfolders/:subfolderId`
> para que o segmento `batch` não seja interpretado como um `subfolderId`.

---

## Contrato de Entrada

```json
{
  "subfolders": [
    {
      "name": "WH-WORDS",
      "position": 1,
      "propagateToStudents": true,
      "exercises": [
        {
          "title": "TODOS WH QUESTIONS - lista organizada",
          "type": "EXERCISE",
          "originalFilename": "wh-questions.docx",
          "convertedHtml": "<p>HTML gerado pelo Mammoth...</p>"
        }
      ],
      "materials": [
        {
          "title": "WH-Words — vídeo introdutório",
          "type": "VIDEO",
          "url": "https://www.youtube.com/watch?v=c2dyvWhu_Y0",
          "convertedHtml": null,
          "originalFilename": null,
          "description": "Aula de introdução às WH-Words"
        },
        {
          "title": "Apostila WH-Words",
          "type": "DOCUMENT",
          "url": null,
          "convertedHtml": "<p>Conteúdo em HTML...</p>",
          "originalFilename": "apostila-wh-words.docx",
          "description": null
        }
      ]
    },
    {
      "name": "TO-BE",
      "position": 2,
      "propagateToStudents": false,
      "exercises": [],
      "materials": []
    }
  ]
}
```

### Campos de `subfolders[]`

| Campo                | Tipo       | Obrigatório | Descrição                                                                              |
|----------------------|------------|-------------|----------------------------------------------------------------------------------------|
| `name`               | `string`   | ✅          | Nome da subpasta                                                                       |
| `position`           | `integer`  | ❌          | Ordem de exibição dentro da pasta pai (default: ordem do array)                        |
| `propagateToStudents`| `boolean`  | ❌          | Se `true`, copia a subpasta + conteúdos para todos os alunos do perfil (default: false)|
| `exercises`          | `array`    | ❌          | Lista de exercícios a criar (pode ser `[]`)                                            |
| `materials`          | `array`    | ❌          | Lista de materiais de estudo a criar (pode ser `[]`)                                   |

### Campos de `exercises[]`

| Campo              | Tipo            | Obrigatório | Descrição                                         |
|--------------------|-----------------|-------------|---------------------------------------------------|
| `title`            | `string`        | ✅          | Título do exercício                               |
| `type`             | `string`        | ✅          | Sempre `"EXERCISE"`                               |
| `originalFilename` | `string\|null`  | ❌          | Nome do arquivo `.docx` de origem                 |
| `convertedHtml`    | `string\|null`  | ✅          | HTML gerado pelo Mammoth (pode ser `null`)        |

### Campos de `materials[]`

| Campo              | Tipo                          | Obrigatório       | Descrição                                   |
|--------------------|-------------------------------|-------------------|---------------------------------------------|
| `title`            | `string`                      | ✅                | Título do material                          |
| `type`             | `"VIDEO"\|"DOCUMENT"\|"LINK"` | ✅                | Tipo do material                            |
| `url`              | `string\|null`                | ✅ para VIDEO/LINK | URL do recurso externo; `null` para DOCUMENT|
| `convertedHtml`    | `string\|null`                | ✅ para DOCUMENT   | HTML do conteúdo; `null` para VIDEO/LINK    |
| `originalFilename` | `string\|null`                | ❌                | Nome do arquivo original (DOCUMENT)         |
| `description`      | `string\|null`                | ❌                | Descrição curta                             |

---

## Contrato de Saída — `201 Created`

```json
{}
```

> O front-end usa `response.subfolders` para atualizar o estado local imediatamente
> após o save — portanto o array `subfolders` com os dados persistidos **é obrigatório**
> na resposta.

---

## Regras de Negócio

### 1. Criação das subpastas e conteúdos

- Para cada item em `subfolders`:
  1. Criar a `LevelSubfolder` vinculada ao `LevelFolder` (`folderId`) e ao `LevelProfile` (`profileId`)
  2. Para cada item em `exercises`: criar um `LevelFolderTemplate` vinculado à subpasta criada
  3. Para cada item em `materials`: criar um `StudyMaterial` vinculado à subpasta criada
  4. O campo `createdBy` dos materiais deve ser preenchido com o ID do professor autenticado

### 2. Propagação (`propagateToStudents: true`)

Quando uma subpasta tiver `propagateToStudents: true`, o back-end deve:

1. **Buscar todos os alunos** cujo `levelProfileId` é igual ao `profileId` da requisição
2. Para cada aluno encontrado, **localizar a pasta do workspace** do aluno que corresponde
   ao mesmo `LevelFolder` (a pasta pode ser identificada pelo `levelFolderId` ou pela
   posição/nome — seguir como o projeto já resolve esse mapeamento)
3. **Criar uma cópia da subpasta** nessa pasta do workspace do aluno:
   - Mesmos `name` e `position`
   - Para cada exercício: criar uma cópia do `Template` (ou entidade equivalente no workspace do aluno)
   - Para cada material: criar uma cópia do `StudyMaterial` (ou entidade equivalente)
4. A propagação deve ser feita de forma **atômica** por aluno — se um aluno falhar,
   logar o erro mas continuar para os demais (não travar o batch inteiro)
5. Retornar normalmente o `subfolders` criado no perfil de nível; **a propagação é um
   efeito colateral** e não faz parte da resposta da API

### 3. Transação

- Toda a criação do batch (subpastas + exercícios + materiais) deve estar dentro de
  uma **transação única**. Se qualquer item falhar, reverter tudo
- A propagação pode ser feita fora da transação principal (é um side-effect que não
  deve bloquear o retorno para o professor)

### 4. Autorização

- Apenas professores autenticados com permissão sobre o `LevelProfile` podem chamar
  este endpoint
- Validar que `profileId` e `folderId` existem e pertencem ao tenant/professor

---

## Fluxo de Camadas (seguir a estrutura do projeto)

```
Controller (HTTP)
  └── UseCase: CreateSubfoldersBatchUseCase
        ├── LevelSubfolderGateway.createBatch(profileId, folderId, subfolders[])
        │     └── Persiste subpastas + exercícios + materiais em transação
        └── [se propagateToStudents]
              └── PropagateSubfoldersToStudentsUseCase (ou método interno)
                    ├── StudentGateway.findByLevelProfile(profileId)
                    └── StudentWorkspaceFolderGateway.addSubfolder(studentId, folderId, subfolder)
```

> Perguntas para o back-end antes de implementar:
> 1. Como está mapeado hoje o relacionamento **Student → LevelProfile**? (campo direto, tabela de junção?)
> 2. Como está a entidade do workspace do aluno? Ela espelha `LevelFolder` pelo `id` ou por outro campo?
> 3. Existe já algum mecanismo de "copy" de template/material para workspace do aluno que possa ser reutilizado?
> 4. A propagação deve ser **síncrona** (dentro do request) ou pode ser disparada como um **job assíncrono** (queue)?

---

## Erros Esperados

| Status | Situação                                                         |
|--------|------------------------------------------------------------------|
| `200`  | Sucesso — retorna `{ subfolders: [...] }`                        |
| `400`  | Body inválido (campos obrigatórios ausentes, `type` inválido)    |
| `401`  | Token ausente ou expirado                                        |
| `403`  | Professor sem permissão sobre o perfil                           |
| `404`  | `profileId` ou `folderId` não encontrado                         |
| `409`  | Conflito de posição (opcional — se a lógica rejeitar duplicatas) |
| `500`  | Erro interno (falha na transação)                                |

