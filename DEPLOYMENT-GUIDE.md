# 🚀 Guide de Déploiement Supabase + Lovable

## 📋 **Étapes de déploiement :**

### **Étape 1 : Configurer les secrets Supabase**

1. **Va sur ton tableau de bord Supabase :**
   - Connecte-toi sur [supabase.com](https://supabase.com)
   - Sélectionne ton projet `vhljhfumyihymivvlyzb`

2. **Configurer le secret pour l'API Anthropic :**
   - Dans le menu de gauche, clique sur **"Edge Functions"**
   - Clique sur l'onglet **"Secrets"** 
   - Clique sur **"Add secret"**
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : `ta_clé_api_anthropic_ici` (celle que tu as obtenue d'Anthropic)
   - Clique **"Save"**

### **Étape 2 : Déployer les Edge Functions**

⚠️ **Prérequis :** Assure-toi d'avoir la CLI Supabase installée :

```bash
# Installation de la CLI Supabase (si pas déjà fait)
npm install -g supabase

# Login sur Supabase
supabase login
```

**Déployer les fonctions :**

```bash
# Lier ton projet local au projet Supabase
supabase link --project-ref vhljhfumyihymivvlyzb

# Déployer les Edge Functions
supabase functions deploy analyze-profiles
supabase functions deploy upload-profiles
```

### **Étape 3 : Déployer sur Lovable**

1. **Push ton code sur Git :**
   ```bash
   git add .
   git commit -m "Add Supabase Edge Functions for profile analysis"
   git push
   ```

2. **Sur Lovable :**
   - Va dans ton projet Lovable
   - Reconnecte le repository Git si nécessaire
   - Lance le déploiement

3. **Variables d'environnement dans Lovable :**
   - Les URLs Supabase sont déjà configurées dans ton code
   - Aucune variable supplémentaire nécessaire côté frontend

### **Étape 4 : Test du déploiement**

Une fois déployé, teste les URLs suivantes :

**Edge Functions déployées :**
- `https://vhljhfumyihymivvlyzb.supabase.co/functions/v1/analyze-profiles`
- `https://vhljhfumyihymivvlyzb.supabase.co/functions/v1/upload-profiles`

**Test avec curl :**
```bash
# Test de l'analyse
curl -X POST 'https://vhljhfumyihymivvlyzb.supabase.co/functions/v1/analyze-profiles' \
-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobGpoZnVteWloeW1pdnZseXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjQzMTAsImV4cCI6MjA3MTAwMDMxMH0.TJkRs5sRYWcpfbkOAiytuoKPKQFL8vYf1FEyvC5alH0' \
-H 'Content-Type: application/json' \
-d '{"jobDescription":"Nous recherchons un développeur full-stack React/Node.js"}'
```

## 🔧 **Commandes utiles**

```bash
# Voir les logs des fonctions
supabase functions logs

# Déployer une fonction spécifique
supabase functions deploy analyze-profiles

# Voir le statut des fonctions
supabase functions list
```

## ✅ **Vérifications finales**

1. ✅ Edge Functions déployées
2. ✅ Secret ANTHROPIC_API_KEY configuré
3. ✅ Frontend adapté pour Supabase
4. ✅ Application déployée sur Lovable
5. ✅ Tests fonctionnels OK

## 🚨 **En cas de problème**

### **Erreur "ANTHROPIC_API_KEY not configured"**
- Vérifie que le secret est bien configuré dans Supabase
- Redéploie la fonction après avoir ajouté le secret

### **Erreur CORS**
- Les headers CORS sont déjà configurés dans les Edge Functions
- Vérifie que tu utilises les bonnes URLs

### **Erreur d'authentification**
- Vérifie que tu utilises la bonne clé API Supabase (anon key)
- Elle est déjà incluse dans le code frontend

## 📊 **Avantages de cette architecture**

✅ **Serverless** : Pas besoin de gérer de serveurs  
✅ **Scalable** : Auto-scaling avec Supabase  
✅ **Sécurisé** : Clés API cachées côté serveur  
✅ **Compatible Lovable** : Déploiement direct  
✅ **Performant** : Edge Functions rapides  

Ton application sera accessible en live une fois ces étapes terminées ! 🎉