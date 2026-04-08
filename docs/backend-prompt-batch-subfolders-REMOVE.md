# Backend — O que deve ser REMOVIDO

## Contexto

Com a adoção do endpoint de batch (`POST .../subfolders/batch`) para criação de
subpastas + exercícios + materiais em uma única operação, os endpoints de criação
individual abaixo se tornaram **obsoletos e não são mais chamados pelo front-end**.

Remover esses endpoints elimina dead-code, simplifica o roteamento e evita que
flows antigos sejam acidentalmente reativados.

---

## Endpoints a Remover

### 1. `POST /level-profiles/:profileId/folders/:folderId/subfolders`
> **Criação individual de subpasta (sem conteúdo)**

- **Por que remover:** substituído pelo batch. Criar uma subpasta vazia unitariamente
  não faz mais sentido no fluxo atual — subpastas só são criadas junto com seus
  exercícios e materiais.
- **Remover:**
  - Route/Controller: handler do `POST .../subfolders`
  - Use Case: `CreateLevelSubfolderUseCase` (ou equivalente)
  - Gateway (interface): método `create(subfolder)` em `LevelSubfolderGateway`
  - Implementação (repository): método correspondente

---

### 2. `POST /level-profiles/:profileId/folders/:folderId/subfolders/:subfolderId/templates`
> **Criação individual de exercício/template dentro de uma subpasta**

- **Por que remover:** exercícios agora só são criados via `exercises[]` dentro do
  batch. O front-end não chama mais este endpoint isoladamente.
- **Remover:**
  - Route/Controller: handler do `POST .../subfolders/:subfolderId/templates`
  - Use Case: `CreateLevelFolderTemplateInSubfolderUseCase` (ou equivalente)
  - Gateway (interface): método `createInSubfolder(...)` em `LevelFolderTemplateGateway`
  - Implementação (repository): método correspondente

---

### 3. `POST /level-profiles/:profileId/folders/:folderId/subfolders/:subfolderId/materials`
> **Criação individual de material de estudo dentro de uma subpasta**

- **Por que remover:** materiais agora só são criados via `materials[]` dentro do
  batch. O front-end não chama mais este endpoint isoladamente.
- **Remover:**
  - Route/Controller: handler do `POST .../subfolders/:subfolderId/materials`
  - Use Case: `CreateStudyMaterialInSubfolderUseCase` (ou equivalente)
  - Gateway (interface): método `create(...)` em `StudyMaterialGateway`
  - Implementação (repository): método correspondente

---

### 4. `POST /level-profiles/:profileId/folders/:folderId/templates` *(legado)*
> **Criação de template diretamente na pasta, sem subfolder**

- **Por que remover:** fluxo legado — templates sem subpasta não são mais criados.
  O front-end nunca chama este endpoint no fluxo atual.
- **Remover:**
  - Route/Controller: handler do `POST .../folders/:folderId/templates`
  - Use Case: `CreateLevelFolderTemplateLegacyUseCase` (ou equivalente)
  - Gateway (interface): método `create(folderId, template)` legado
  - Implementação (repository): método correspondente

---

### 5. `GET /level-profiles/:profileId/folders/:folderId/templates` *(legado)*
> **Listagem de templates diretamente na pasta, sem subfolder**

- **Por que remover:** o front-end não lista mais templates sem subpasta de forma
  isolada. A hierarquia completa (pasta → subpasta → templates/materiais) já é
  retornada pelo `GET /level-profiles/:profileId` ou endpoint de detalhe do perfil.
- **Remover:**
  - Route/Controller: handler do `GET .../folders/:folderId/templates`
  - Use Case: `ListLevelFolderTemplatesUseCase` (ou equivalente)
  - Gateway (interface): método `listByFolder(folderId)` legado
  - Implementação (repository): método correspondente

---

### 6. `DELETE /level-profiles/:profileId/folders/:folderId/templates/:templateId` *(legado)*
> **Remoção de template diretamente da pasta, sem subfolder**

- **Por que remover:** como não há mais templates sem subpasta sendo criados, este
  endpoint de deleção do fluxo legado também não tem uso.
- **Remover:**
  - Route/Controller: handler do `DELETE .../folders/:folderId/templates/:templateId`
  - Use Case: `DeleteLevelFolderTemplateLegacyUseCase` (ou equivalente)
  - Gateway (interface): método `delete(templateId)` legado
  - Implementação (repository): método correspondente

---

## O que **NÃO** deve ser removido

Os endpoints abaixo continuam em uso pelo front-end e **devem ser mantidos**:

| Endpoint                                                                          | Uso atual                                    |
|-----------------------------------------------------------------------------------|----------------------------------------------|
| `GET /level-profiles`                                                             | Listagem de perfis + subpastas + conteúdos   |
| `POST /level-profiles`                                                            | Criação de novo perfil de nível              |
| `PATCH /level-profiles/:profileId`                                                | Edição de perfil (nome, ícone, pastas)       |
| `DELETE /level-profiles/:profileId`                                               | *(se existir)* Remoção de perfil             |
| `GET .../subfolders`                                                              | Listagem de subpastas                        |
| **`POST .../subfolders/batch`**                                                   | ✅ **Novo — criação em lote (manter)**       |
| `PATCH .../subfolders/:subfolderId`                                               | Renomear subpasta existente                  |
| `DELETE .../subfolders/:subfolderId`                                              | Deletar subpasta existente                   |
| `GET .../subfolders/:subfolderId/templates`                                       | Listar exercícios de uma subpasta            |
| `DELETE .../subfolders/:subfolderId/templates/:templateId`                        | Deletar exercício de subpasta                |
| `PATCH .../subfolders/:subfolderId/materials/:materialId`                         | Editar material existente                    |
| `DELETE .../subfolders/:subfolderId/materials/:materialId`                        | Deletar material existente                   |

---

## Checklist de remoção

Para cada endpoint acima, verificar e remover:

- [ ] **Rota** registrada no router/controller
- [ ] **Controller method** (handler HTTP)
- [ ] **Use Case** (application layer)
- [ ] **Interface do Gateway** (porta de saída)
- [ ] **Implementação do Gateway** (repository/adapter)
- [ ] **Testes unitários** do Use Case (se existirem)
- [ ] **Testes de integração / e2e** que cubram a rota (se existirem)
- [ ] **DTOs / Request-Response classes** exclusivos dessas rotas
- [ ] **Swagger/OpenAPI** — remover a documentação das rotas removidas
- [ ] **Migrations** — verificar se há alguma coluna ou constraint criada
  exclusivamente para suportar esses fluxos legados (ex.: `subfolderId nullable`
  em templates era necessário para o fluxo legacy — avaliar se ainda é necessário
  ou se pode ser tornado `NOT NULL` agora que toda template tem subpasta)

---

## Observação sobre o campo `subfolderId` nullable em `LevelFolderTemplate`

No banco, `LevelFolderTemplate.subfolderId` pode ser `null` (suporte legado a
templates sem subpasta). Após a remoção dos endpoints legados e confirmado que
nenhum registro existente tem `subfolderId = null`, avaliar tornar o campo
`NOT NULL` via migration. **Não fazer isso sem verificar os dados de produção antes.**

