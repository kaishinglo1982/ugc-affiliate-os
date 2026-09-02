Projektbeschreibung: CarryOS + UGC Affiliate OS

CarryOS – unsere Version

CarryOS ist kein einzelner KI-Agent und kein simples Automations-Dashboard, sondern ein modulares AI Business Operating System. Es bildet die gemeinsame technische und organisatorische Plattform für mehrere spezialisierte Business-Systeme und Fachplugins.

Die Grundidee lautet:

CarryOS stellt Core, Agent Runtime, Workflows, Skills, Connectoren, KI-Routing, Governance und Business Intelligence bereit. Die Fachplugins liefern nur ihre jeweilige Branchen- und Geschäftslogik.

Dadurch sollen keine Agenten, Workflows oder Infrastruktur mehrfach in verschiedenen Projekten implementiert werden.

Architektur

CarryOS besteht aus mehreren Ebenen:

Carry Core

* gemeinsame Agent Runtime
* Workflow Engine
* Skill Registry
* Agent Registry
* Plugin SDK
* Connector/MCP Layer
* Event Bus
* Permission Broker
* Tenant- und Identity-System
* Audit Logs
* Security und RLS
* Secrets/API-Key Management
* gemeinsame Daten- und Domain-Contracts

CarryOS Control Plane

* zentrale Steuerung aller Businesses
* Agents
* Workflows
* Plugins
* Deployments
* Infrastruktur
* Incidents
* Kosten
* Qualität
* Security

Globale IDs verbinden unter anderem:

tenant → plugin → workflow → agent → runtime → deployment → incident → business object

AI Workforce

CarryOS besitzt zusätzlich einen Workforce Intelligence Layer.

Dieser analysiert ein Unternehmen und erkennt:

* vorhandene Fähigkeiten
* fehlende Fähigkeiten
* automatisierbare Prozesse
* benötigte Skills
* benötigte Agenten
* benötigte Plugins
* benötigte Connectoren
* ROI-Potenziale

Wichtige Komponenten:

* Business Audit Engine
* Capability Graph
* Skill Registry
* Agent Registry
* Workforce Generator
* Automation Score
* ROI Engine
* Plugin Recommendation Engine

Im Bereich AI Workforce sieht ein Unternehmen beispielsweise:

* Organization Map
* aktive KI-Agenten
* empfohlene Agenten
* Missing Capabilities
* Skills
* Automation Score
* erwarteten ROI

CarryOS kann damit perspektivisch aus einem Unternehmensprofil automatisch eine passende digitale KI-Belegschaft zusammenstellen.

Agentenmodell

Agenten ohne spezielle Branchenlogik gehören grundsätzlich in Carry Core.

Beispiele:

* Research Agent
* Content Agent
* Social Media Agent
* SEO Agent
* Ads Agent
* CRM Agent
* Sales Agent
* Finance Agent
* Support Agent
* Analytics Agent
* Workflow Agent
* Compliance Agent

Ein Fachplugin erweitert diese Agenten nur um seine eigene Domain-Logik.

Beispiel:

Der allgemeine Sales Agent liegt im Core.

Ein Energy-Sales-Plugin ergänzt ihn um Strom-/Gas-Tarife, Vertragslogik und entsprechende Sales-Prozesse.

Das verhindert doppelte Agenten in jedem Repository.

Plugin-System

Spezialisierte Businesses laufen als Plugins bzw. Erweiterungen von CarryOS.

Beispiele:

* SHK
* Energy Sales / Teleson
* UGC Affiliate OS / Fashion Agency
* Noir Agency
* NCH Agency

Plugins können eigene:

* Workflows
* Skills
* UI-Bereiche
* Domain Contracts
* Business Objects
* Knowledge
* Agent-Konfigurationen

mitbringen.

Sie sollen aber keine CarryOS-Core-Funktionen duplizieren.

Connector- und MCP-System

Externe Systeme werden über ein standardisiertes Connector-System angebunden.

Dazu gehören beispielsweise:

* Meta
* Google
* TikTok
* Instagram
* YouTube
* Amazon
* Affiliate Networks
* CRM-Systeme
* DATEV
* Stripe
* WhatsApp
* E-Mail
* Telefonie
* Google Workspace
* Microsoft 365
* GitHub
* n8n
* externe SaaS-Systeme

MCP und Skills sollen als standardisierte Erweiterungsschicht integriert werden.

Ein Connector wird zentral verwaltet und kann von mehreren Plugins verwendet werden.

KI-Routing

CarryOS soll nicht fest an einen einzelnen Modellanbieter gekoppelt sein.

Unser vorgesehenes Routing arbeitet über eine zentrale Model-/Provider-Schicht.

Die Free-/Fallback-Kaskade ist grundsätzlich:

OmniRoute Free Tier → OpenCode Go → Zen → OmniRoute Paid

Bei:

* Fehler
* Timeout
* Rate Limit
* fehlender Modellfähigkeit
* fehlendem Vision Support

wird auf die nächste Stufe eskaliert.

Latenzkritische oder geschäftskritische Tasks können die günstige Kaskade überspringen und direkt ein hochwertigeres Modell verwenden.

CarryOS protokolliert dabei:

* verwendetes Backend
* Modell
* Kosten
* Eskalationsschritte
* Laufzeit
* Qualität

Damit entsteht ein eigener AI-FinOps-Layer.

BYO API

Bei vielen Integrationen verfolgen wir ein Bring Your Own API Key / Bring Your Own Account Modell.

Der Kunde verbindet beim Onboarding beispielsweise:

* Meta
* Google
* OpenAI/LLM Provider
* Affiliate Networks
* Video-KI-Anbieter
* CRM
* Kommunikationskanäle

CarryOS verwaltet die Credentials sicher pro Tenant und stellt sie den berechtigten Workflows und Agenten zur Verfügung.

FinOps

CarryOS soll die Kosten jeder Automatisierung transparent machen.

Dazu gehören:

* Cost Attribution
* Kosten pro Agent
* Kosten pro Workflow
* Kosten pro Plugin
* Token-/API-Kosten
* Budget Limits
* Margin Analysis
* Cost Optimization
* ROI

Das System soll später beispielsweise erkennen:

Dieser Workflow kostet 0,18 € pro Ausführung und erzeugt durchschnittlich 4,30 € Deckungsbeitrag.

⸻

UGC Affiliate OS

UGC Affiliate OS ist ein spezialisiertes Business-System auf CarryOS-Basis.

Das Ziel ist eine weitgehend automatisierte UGC-, Content- und Affiliate-Commerce-Agentur, die mehrere Marken, Nischen und Social-Media-Accounts betreiben kann.

Es ist damit kein separates technisches Betriebssystem, sondern perspektivisch ein Fachplugin bzw. eine Business Edition von CarryOS.

Kernziel

UGC Affiliate OS soll den kompletten Zyklus automatisieren:

Produkt finden → bewerten → Affiliate-Link → Content-Idee → Script → Creative → Video → Veröffentlichung → Tracking → Optimierung → Skalierung

Das System kann mehrere sogenannte Ghost Brands bzw. Nischenmarken gleichzeitig betreiben.

Beispiele:

* Fashion
* Beauty
* Home
* Tech
* Fitness
* Haustiere
* Lifestyle

Jede Brand kann mehrere Social Accounts besitzen.

Affiliate Networks

Geplante bzw. relevante Integrationen:

* Amazon Affiliate
* Awin
* CJ
* Impact
* Rakuten
* ShareASale
* Adcell
* weitere Händler- und Affiliate-Netzwerke

Das System soll Produkte automatisch erkennen, bewerten und priorisieren.

Bewertet werden beispielsweise:

* Provision
* Produktpreis
* Conversion-Potenzial
* Social-Media-Trend
* Content-Potenzial
* Wettbewerb
* Marge
* verfügbare Creatives
* Zielgruppenfit

Daraus entsteht ein Opportunity Score.

Content Factory

Die Content Engine erstellt automatisiert:

* Hooks
* Scripts
* Storyboards
* Captions
* Produktbeschreibungen
* Blogartikel
* SEO Content
* Social Posts
* UGC-Konzepte
* Video-Prompts
* Thumbnail-Ideen
* Call-to-Actions

CarryOS-Agenten übernehmen dabei generische Aufgaben.

Das UGC Affiliate Plugin liefert spezifische Affiliate- und Commerce-Skills.

Video Pipeline

Für Video Content soll das System unterschiedliche Produktionswege unterstützen.

Premium-KI beispielsweise:

* Kling
* HeyGen
* Higgsfield
* andere Video-KI-Plattformen

Diese können über eigene Accounts des Kunden angebunden werden.

Zusätzlich sollen kostengünstigere bzw. freie Modelle über die zentrale CarryOS-Routing-Schicht verwendet werden.

Auch echtes selbst aufgenommenes UGC-Material kann in die Pipeline eingespeist werden.

Beispiel:

Rohvideo → Szenenerkennung → Schnittvorschläge → Hook → Untertitel → Voiceover → CTA → Varianten → Publishing

Social Media

Geplante Plattformen:

* TikTok
* Instagram
* Facebook
* YouTube
* Reddit

CarryOS verwaltet dafür zentrale Connectoren.

Das UGC Affiliate OS steuert:

* Content Kalender
* Publishing
* Account-Zuordnung
* Kampagnen
* Varianten
* Performance
* Kommentare
* Community
* Conversion Tracking

Multi-Brand / Multi-Account

Eine Installation soll beispielsweise gleichzeitig verwalten können:

Brand 1 – Fashion

* TikTok Account A
* Instagram Account A
* YouTube Shorts A

Brand 2 – Beauty

* TikTok Account B
* Instagram Account B

Brand 3 – Tech

* TikTok Account C
* YouTube Account C

Agenten und Workflows werden dabei nicht für jede Brand kopiert.

CarryOS startet dieselben Agenten mit jeweils anderem:

* Tenant
* Brand Context
* Knowledge
* Credentials
* Workflow State

Analytics und Self-Optimization

Das System soll messen:

* Views
* Watch Time
* CTR
* Conversion Rate
* Affiliate Revenue
* Revenue per Video
* Revenue per Product
* Revenue per Brand
* Kosten
* ROI

Daraus lernt das System beispielsweise:

Hook-Typ B funktioniert bei Beauty-Produkten 31 % besser als Hook-Typ A.

Diese Erkenntnisse fließen anschließend wieder in neue Content-Generationen.

Damit entsteht ein geschlossener Optimierungsloop:

Publish → Measure → Learn → Generate → Test → Scale

Verhältnis zwischen CarryOS und UGC Affiliate OS

Wichtig für die Architektur:

CarryOS besitzt die Infrastruktur.

Dazu gehören:

* Agent Runtime
* Model Routing
* Connectoren
* Skills
* Workflows
* Auth
* Security
* Tenant Management
* Memory
* Knowledge
* FinOps
* Analytics
* Plugin-System

UGC Affiliate OS besitzt die Fachlogik.

Dazu gehören:

* Affiliate Opportunity Scoring
* Produkt-Recherche-Workflows
* UGC Content Strategie
* Ghost-Brand-Management
* Affiliate Publishing
* Commerce Analytics
* Video-Pipeline-Konfiguration
* Affiliate Network Integrationen
* Revenue Optimization

Es soll deshalb langfristig möglichst wenig redundanten Code zwischen beiden Systemen geben.

⸻

Zielbild

Das langfristige Ziel ist ein System, bei dem ein Benutzer in CarryOS beispielsweise sagt:

„Ich möchte eine automatisierte Fashion Affiliate Agency aufbauen.“

CarryOS führt anschließend einen Business Audit durch und erzeugt eine passende Workforce:

* Affiliate Research Agent
* Product Analyst
* Content Strategist
* Script Writer
* UGC Creator
* Video Producer
* Social Publisher
* Community Agent
* SEO Agent
* Analytics Agent
* Optimization Agent

Danach empfiehlt CarryOS das UGC Affiliate / Fashion Agency Plugin, fragt die benötigten Accounts und API-Verbindungen ab und installiert die erforderlichen Skills, Connectoren und Workflows.

Der Benutzer steuert anschließend das gesamte Unternehmen über CarryOS.

Das ist unser eigentliches Zielbild:

CarryOS ist das AI Business Operating System.
Plugins sind spezialisierte digitale Unternehmen.
Agenten sind die digitale Belegschaft.
Skills sind deren Fähigkeiten.
Workflows sind die Geschäftsprozesse.
Connectoren verbinden die reale Außenwelt.