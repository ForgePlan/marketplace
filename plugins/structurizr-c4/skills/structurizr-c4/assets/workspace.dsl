// Draft example. Replace these illustrative elements with repository evidence.
workspace __SYSTEM_NAME__ "Draft architecture template; not a discovered system" {
    !identifiers hierarchical
    // Documentation/ADRs are not fabricated for an unresearched template.
    // Replace these INFO omissions with actual !docs / !adrs when available.
    properties {
        structurizr.inspection.model.softwaresystem.documentation info
        structurizr.inspection.model.softwaresystem.decisions info
    }
    model {
        user = person "User" "Uses the system to accomplish its main task"
        system = softwareSystem __SYSTEM_NAME__ "Replace with the system responsibility" {
            api = container "Application" "Provides the system capability" "Replace with actual technology" {
                handler = component "Request handler" "Handles a use case" "Replace with actual module"
            }
            database = container "Data store" "Persists application data" "Replace with actual storage" {
                tags "Database"
            }
        }
        user -> system.api "Uses" "HTTPS"
        system.api -> system.database "Reads and writes" "Database protocol"
        system.api.handler -> system.database "Reads and writes" "Database protocol"
    }
    views {
        systemContext system "Context" "System boundary, actors and dependencies" {
            include *
            autoLayout lr
        }
        container system "Containers" "Runtime applications and data stores" {
            include *
            autoLayout lr
        }
        component system.api "ApplicationComponents" "Logical components inside the application" {
            include *
            autoLayout lr
        }
        styles {
            element "Element" {
                color #ffffff
                background #142c43
            }
            element "Person" {
                shape Person
                background #007c83
            }
            element "Container" {
                background #1c6b96
            }
            element "Component" {
                background #427d9c
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
    configuration {
        scope softwaresystem
    }
}
