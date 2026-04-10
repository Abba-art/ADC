# Backend ADC - Documentation de l'API

Ce projet est une API RESTful développée en **Node.js** avec **Hono**, utilisant **Prisma** comme ORM et **TypeScript** pour le typage strict.

## 🚀 Prérequis et Installation

1. Cloner le dépôt.
2. S'assurer d'avoir **Node.js** installé.
3. Installer les dépendances :

```bash
npm install
```

4. Configurer les variables d'environnement (Créer un fichier `.env` à la racine avec vos accès BDD et autres secrets : `DATABASE_URL`, clés JWT, etc.).
5. Lancer l'environnement de développement :

```bash
npm run dev
```

Le serveur sera accessible sur : `http://localhost:3000`

---

## 🛠️ Architecture et Technologies

- **Framework Web :** Hono (Node.js)
- **Base de données :** PostgreSQL (via Prisma ORM)
- **Validation des données :** Zod (`@hono/zod-validator`)
- **Sécurité & Middlewares :** 
  - `authMiddleware` : Vérification du token d'authentification.
  - `requireRole` : Contrôle d'accès basé sur les rôles (RBAC).
  - `institutGuard` : Cloisonnement des données selon l'institut d'affectation des utilisateurs.

---

## 🛡️ Rôles et Sécurité

Le système est basé sur 4 rôles principaux, par ordre de permissions :

1. **ADMIN** : Accès global à l'ensemble de l'application (tous les instituts, toutes les actions).
2. **CHEF_ETABLISSEMENT** : Accès restreint aux données de son établissement/institut. Peut consulter et désactiver les professeurs.
3. **CHEF_DEPARTEMENT** : Accès restreint aux données de son département/institut. Mêmes droits de base que le chef d'établissement concernant la gestion des enseignants.
4. **PROFESSEUR** : Accès limité à ses propres données et à l'export de sa propre charge horaire/fiche d'enseignement.

---

## 📚 Documentation Interactive (Swagger)

Une interface **Swagger UI** est intégrée au projet pour tester visuellement les routes et consulter les schémas attendus.
- Accéder à l'interface : `http://localhost:3000/swagger`
- Fichier source OpenAPI : `http://localhost:3000/openapi.json`

## 📡 Routes de l'API

### 🔹 Utilisateurs (`/utilisateurs`)
Toutes ces routes nécessitent d'être authentifié et de passer le `institutGuard`.

| Méthode | Route | Rôles Autorisés | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/utilisateurs/professeurs` | *Tous* | Récupère la liste de tous les professeurs actifs avec leur statut et le calcul de leurs charges d'enseignement. |
| **GET** | `/utilisateurs/` | `ADMIN`, `CHEF_*` | Récupère tous les utilisateurs (Filtrés automatiquement par institut pour les chefs). |
| **GET** | `/utilisateurs/:id` | *Tous* | Récupère un utilisateur spécifique. (Un professeur ne peut consulter que son propre profil). Supporte le paramètre `?withCharge=true`. |
| **PATCH**| `/utilisateurs/:id` | `ADMIN` | Modifie un profil (nom, prenom, rôle, statut). Impossible de modifier son propre rôle. |
| **DELETE**| `/utilisateurs/:id` | `ADMIN`, `CHEF_*` | Suppression logique (soft delete / corbeille) d'un compte. (Les chefs ne peuvent supprimer que des profs). |
| **POST** | `/utilisateurs/:id/restore` | `ADMIN`, `CHEF_*` | Restaure un compte précédemment mis à la corbeille. |
| **POST** | `/utilisateurs/:id/instituts`| `ADMIN` | Assigne un utilisateur à un institut. |
| **GET** | `/utilisateurs/:id/export-charge`| *Tous* | Exporte la fiche de charge de l'enseignant au format PDF. |

**Format des réponses standards :**

*Succès (GET) :*
```json
{
  "success": true,
  "count": 10, // (Optionnel, présent sur les listes)
  "data": [ { "id": "...", "nom": "Doe", "prenom": "John", "statut": {...} } ]
}
```

*Succès (PATCH / DELETE / POST) :*
```json
{
  "success": true,
  "message": "Action effectuée avec succès",
  "data": { ... } // (Optionnel, contient l'objet mis à jour)
}
```

---

### 🔹 Statuts (`/statuts`)
Gestion des statuts et des quotas horaires. Protégé par token d'authentification.

| Méthode | Route | Rôles Autorisés | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/statuts/` | *Tous* | Récupère la liste complète des statuts. |
| **PATCH** | `/statuts/:id` | `ADMIN` | Met à jour un statut (ex: `quotaHeureMax`, `quotaPeriode`). |

**Exemple de réponse (GET) :**
```json
{
  "success": true,
  "data": [
    { "id": 1, "libelle": "Titulaire", "quotaHeureMax": 384, "quotaPeriode": "SEMESTRE" }
  ]
}
```

---

### 🔹 Autres Modules de l'API
*(Ces routes sont définies dans l'index principal, avec leurs sous-routes spécifiques)*

- **Authentification** : `/auth` (Login, vérification de session)
- **Structures** : `/structure` (Gestion de l'arborescence des structures/départements)
- **Instituts** : `/instituts` (Gestion des instituts de l'école)
- **Référentiel** : `/referentiel` (Données générales de référence)
- **Attributions** : `/attributions` (Gestion des attributions de cours)
- **Tableau de Bord** : `/dashboard` (Statistiques et indicateurs de la page d'accueil)

---

## 🚨 Gestion des Erreurs

Toutes les erreurs sont catchées de manière centralisée et retournées en format JSON :
```json
{
  "success": false,
  "message": "Description claire de l'erreur",
  "stack": "..." // (Uniquement en mode de développement)
}
```
Code standards HTTP utilisés :
- `400` : Requête invalide (ex: ID manquant ou validation Zod échouée).
- `401` : Non authentifié (Token manquant ou invalide).
- `403` : Accès interdit (Rôle insuffisant ou tentative d'accès à la ressource d'un autre utilisateur).
- `404` : Ressource non trouvée.
- `410` : Compte désactivé (Corbeille).
- `500` : Erreur interne du serveur.
