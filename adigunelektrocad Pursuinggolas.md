# ADIGUNELECTROCAD
## OFFICIAL MASTER DEVELOPMENT, ENGINEERING, DESIGN, SIMULATION, TESTING AND DEPLOYMENT SPECIFICATION

**Project:** AdigunElectroCAD  
**Product category:** Professional Electrical CAD, Industrial Power Circuit Design and Live Electrical Simulation  
**Parent company:** Hephzibah Behulah  
**Division:** HB Elektroniker  
**Product:** AdigunElectroCAD  
**Repository:** `HephzibahBehulahHQ/AdigunElectroCAD`  
**Production URL:** https://hephzibahbehulahhq.github.io/AdigunElectroCAD/  
**Hosting:** GitHub Pages  
**Required component catalog:** Minimum 500 individually functional industrial electrical components and variants  
**Required project library:** Minimum 500 individually verified, runnable electrical engineering projects  
**Primary reference:** The attached industrial electrical power-circuit image

---

# PART 1 — YOUR ROLE AND MISSION

You are the principal AI software engineering agent responsible for designing, implementing, testing, documenting and deploying AdigunElectroCAD.

Act as a coordinated engineering team comprising:

1. Senior electrical engineer specializing in low-voltage electrical installations and industrial power distribution.
2. Industrial automation engineer specializing in motor control, relay logic, contactors, protective devices and PLC systems.
3. Electrical CAD architect experienced in IEC-style electrical schematics and technical documentation.
4. Electrical simulation engineer specializing in circuit topology, switching events, electrical calculations and motor models.
5. Frontend software architect specializing in React, TypeScript, SVG, CAD editors and complex browser applications.
6. Backend and data architect.
7. UI/UX designer specializing in professional engineering workstations.
8. Software quality assurance engineer.
9. Cybersecurity and application security engineer.
10. Technical documentation and internationalization specialist.
11. GitHub Actions and GitHub Pages deployment engineer.
12. Engineering education and curriculum designer.

Your responsibility is to deliver a genuine engineering application, not a marketing website, drawing mockup, nonfunctional prototype or collection of placeholder controls.

The user must be able to create electrical schematics, connect actual electrical terminals, edit component properties, run simulations, operate switches, inspect measurements, identify faults, save projects and export engineering documentation.

The attached image is the primary visual and engineering reference.

The final software must provide the same type of electrical power-circuit schematic experience while extending it into a comprehensive industrial electrical CAD and simulation environment.

Do not claim that the original image identifies a particular commercial application. Implement the observable schematic conventions and required functional behavior.

# PART 2 — MANDATORY REPOSITORY INSPECTION

Before creating or modifying application files, inspect these authoritative repositories:

### Corporate repository
https://github.com/HephzibahBehulahHQ/HephzibahBehulahHQ.github.io

### Shared design system
https://github.com/HephzibahBehulahHQ/hb-design-system

### Engineering division
https://github.com/HephzibahBehulahHQ/hb-elektroniker

### Target application
https://github.com/HephzibahBehulahHQ/AdigunElectroCAD

Read the actual files, including where available:

- README.md
- AGENTS.md
- tokens/corporate.json
- tokens/brands.json
- docs/brand-and-product-naming.md
- templates/universal-product/README.md
- Official logo and image assets
- Existing typography and theme definitions
- Existing header and footer templates
- Language configuration and translation files
- Product navigation conventions
- Security and accessibility rules
- Existing deployment workflows

Inspect any additional design-system documentation referenced by those files.

The repositories are authoritative for branding. This prompt supplies product requirements, not permission to override verified corporate assets or design-system rules.

If a required file does not exist, record its absence and use verified available standards. Do not invent corporate logos, claim missing files were inspected or silently replace official assets.

Do not alter the corporate website, design-system repository or Elektroniker division repository unless explicitly authorized.

All AdigunElectroCAD application source code must remain in its dedicated product repository.

Inspect existing local changes before making modifications. Preserve existing work and Git history.

Never force-push, delete repositories, reset unrelated changes or overwrite functioning applications without explicit authorization.

# PART 3 — PRODUCT IDENTITY AND BRANDING

Use the following identity consistently:

**Product name:** AdigunElectroCAD  
**Display title:** AdigunElectroCAD  
**Subtitle:** Professional Electrical CAD & Industrial Circuit Simulator  
**Division:** HB Elektroniker  
**Parent:** Hephzibah Behulah

Brand hierarchy:

Hephzibah Behulah → HB Elektroniker → AdigunElectroCAD.

Use the official corporate logo from the design-system repository.

Use a distinctive AdigunElectroCAD wordmark without replacing or fabricating the official corporate logo.

If a product-specific icon is needed, design an original engineering-themed icon and identify it as a product asset, not an official corporate logo.

## Color system

Use the verified design-system tokens as the source of truth.

Known brand colors:

- Midnight Navy: `#0B1220`
- Royal Blue: `#2563EB`
- Metallic Gold: `#D4AF37`
- Ivory White: `#F8FAFC`
- Electric Cyan: `#22D3EE`

Electric Cyan is the primary HB Elektroniker accent.

Use semantic colors for simulation states, warnings and errors.

Do not rely on color alone to communicate electrical status.

Electrical wire colors must be configurable by standards, project settings and circuit conventions.

A wire's visual color must never independently determine its actual electrical connectivity or voltage.

# PART 4 — REQUIRED APPLICATION LAYOUT

Build a professional desktop-class CAD workspace inside the browser.

The main application must prioritize engineering productivity.

## 4.1 Header

Include:

- Main Site navigation
- Official corporate logo
- AdigunElectroCAD product wordmark
- HB Elektroniker division identification
- Current project name
- Saved/unsaved status
- Undo and redo
- Simulation status
- Language selector
- Light/dark/system theme selector
- Adigun BOT access
- Account/profile control when authentication is enabled
- Help and documentation access

Avoid duplicate logos, duplicate theme buttons or repeated language selectors.

## 4.2 Main menu

Implement functional menus:

**File**
- New Project
- Open Project
- Recent Projects
- Save
- Save As
- Import
- Export
- Print
- Project Properties
- Templates
- Recovery
- Close Project

**Edit**
- Undo
- Redo
- Cut
- Copy
- Paste
- Duplicate
- Delete
- Select All
- Find
- Replace Component
- Rotate
- Mirror
- Align
- Distribute
- Group
- Ungroup

**View**
- Zoom In
- Zoom Out
- Fit Drawing
- Actual Size
- Grid
- Snap
- Rulers
- Layers
- Navigator
- Full Screen
- Panel Visibility
- Connection Highlighting
- Electrical State Overlay

**Insert**
- Component
- Power Source
- Wire
- Junction
- Terminal
- Connector
- Cable
- Label
- Annotation
- Text
- Image
- Table
- Cross-reference
- Measurement Probe

**Electrical**
- Power Circuit
- Control Circuit
- Protection
- Motor Control
- Distribution
- Relay Logic
- PLC Wiring
- Terminal Planning
- Cable Planning
- Component Properties
- Electrical Validation

**Simulation**
- Run
- Pause
- Resume
- Stop
- Reset
- Single Step
- Simulation Speed
- Fault Injection
- Measurement
- Event Timeline
- Simulation Settings
- Results

**Project**
- Project Browser
- New Sheet
- Duplicate Sheet
- Sheet Properties
- Revision History
- Design Rules
- Project Validation
- Component Inventory

**Reports**
- Bill of Materials
- Connection List
- Terminal List
- Cable Schedule
- Wire List
- Component List
- Electrical Validation Report
- Simulation Results
- Project PDF

**Tools**
- Multimeter
- Voltage Probe
- Current Probe
- Power Meter
- Continuity Tester
- Oscilloscope
- Calculator
- Symbol Editor
- Component Editor
- Project Validator

**Window**
- Reset Layout
- Show/Hide Panels
- Dock Panels
- Restore Workspace
- Workspace Presets

**Help**
- Documentation
- Tutorials
- Keyboard Shortcuts
- Example Projects
- Component Reference
- Simulation Limitations
- Adigun BOT
- About
- Report Issue

Every enabled menu action must perform its advertised function.

Unavailable future capabilities must not be presented as working.

## 4.3 Toolbar

Provide compact, accessible controls for:

- Select
- Pan
- Wire
- Junction
- Place Component
- Rotate
- Mirror
- Delete
- Undo/Redo
- Zoom
- Snap
- Run/Pause/Stop
- Measurement
- Validation

Use consistent icons, labels, tooltips and keyboard shortcuts.

## 4.4 Left component panel

Create a searchable, collapsible component library.

Include:

- Category tree
- Component search
- Recently used components
- Favorites
- Symbol preview
- Component description
- Terminal preview
- Electrical ratings
- Simulation support
- Manufacturer/model references where licensed and verified
- Drag-and-drop placement

## 4.5 Center schematic canvas

This is the primary workspace.

The canvas must support:

- Large technical drawings
- Multiple pages
- Infinite-style pan/zoom within practical limits
- Precise coordinate placement
- Engineering grid
- Snap-to-grid
- Snap-to-terminal
- Orthogonal wiring
- Component rotation
- Component mirroring
- Electrical junctions
- Wire labels
- Net highlighting
- Component reference designations
- Terminal numbers
- Cross-references
- Multi-selection
- Box selection
- Copy/paste
- Alignment
- Undo/redo
- Interactive simulation overlays

No overlapping menus, clipped controls, invisible connection points or unusable panels.

## 4.6 Right properties panel

When a component is selected, show editable properties:

- Reference designation
- Description
- Component category
- Manufacturer and model, if verified
- Rated voltage
- Rated current
- Rated power
- Frequency
- Contact configuration
- Terminal definitions
- Coil voltage
- Electrical characteristics
- Mechanical characteristics
- Simulation parameters
- State
- Fault settings
- Notes
- Datasheet link when verified

Validate all entered values.

Do not permit nonsensical parameter combinations without warning.

## 4.7 Bottom engineering console

Provide dockable tabs:

- Simulation
- Electrical Errors
- Warnings
- Measurements
- Event Log
- Component Inspector
- Project Validation
- Test Results
- AI Assistant Output

Errors must identify affected components, terminals and relevant sheets.

# PART 5 — REFERENCE IMAGE IMPLEMENTATION

Recreate the electrical schematic style visible in the attached reference image.

The image contains a power circuit with:

- L1
- L2
- L3
- PE
- Switching/protection devices
- Three-pole switching contacts
- Contactor KM2
- Single-phase motor M1
- Three-phase motor M2
- Motor terminal labels
- Electrical conductors
- Junction points
- Component identifiers
- Power-circuit annotation

Use conventional industrial electrical symbols rather than decorative illustrations.

Support the following motor symbol conventions:

- `M 1~` for single-phase AC motor
- `M 3~` for three-phase AC motor

Support conductor and terminal identification including:

- L1, L2, L3
- N
- PE
- U1, V1, W1
- U2, V2, W2
- A1, A2
- 13, 14
- 21, 22
- 95, 96
- 97, 98
- 1/L1, 3/L2, 5/L3
- 2/T1, 4/T2, 6/T3

These are examples; actual terminal labels must depend on component type and applicable conventions.

### Important reference-image validation

The reference image is partially cropped and low resolution.

Do not assume every visible conductor, device designation or terminal connection is electrically correct.

Create two distinct deliverables:

1. A visual reference-style example preserving the recognizable layout and symbol style.
2. A separately validated and electrically coherent working demonstration circuit.

Do not silently convert questionable wiring into a claimed safe installation.

# PART 6 — ELECTRICAL COMPONENT LIBRARY

Build a minimum of **500 distinct, usable industrial electrical catalog entries**.

A catalog entry counts only if it includes:

1. Unique component ID.
2. Meaningful engineering name.
3. Correct symbol.
4. Defined terminals.
5. Valid electrical properties.
6. Connection rules.
7. Property editor support.
8. Simulation model or explicitly declared supported abstraction.
9. Automated validation tests.
10. Documentation and example usage.

Do not count simple color changes, duplicate names, empty JSON records or repeated symbols as separate functional components.

Where manufacturer-specific models are used, verify public specifications and licensing.

Generic components may use clearly documented engineering assumptions.

## Required catalog distribution

| Category | Minimum entries |
|---|---:|
| Power sources and supply equipment | 30 |
| Circuit breakers and disconnectors | 40 |
| Fuses and protective devices | 35 |
| Contactors and motor starters | 45 |
| Relays and auxiliary contacts | 45 |
| Switches and pushbuttons | 35 |
| Single-phase and three-phase motors | 40 |
| Transformers and power conversion | 30 |
| Sensors and limit switches | 35 |
| PLC I/O and industrial control | 35 |
| Timers, counters and control modules | 25 |
| Terminal blocks, connectors and cables | 35 |
| Measuring and indicating devices | 25 |
| Industrial loads and actuators | 35 |
| Power electronics and drives | 30 |
| **Total** | **520** |

### Power supply components

Implement examples including:

- Single-phase AC supply
- Three-phase AC supply
- DC supply
- 24 V DC control supply
- Battery source
- Adjustable AC source
- Adjustable DC source
- Isolated supply
- Control transformer
- Three-phase distribution source
- Generator model
- UPS model

### Protection components

Implement:

- MCB
- MCCB
- Fuse
- Fuse holder
- Isolator
- Switch disconnector
- RCD
- RCBO
- Motor protection circuit breaker
- Thermal overload relay
- Electronic overload relay
- Undervoltage relay
- Overvoltage relay
- Phase monitoring relay
- Phase sequence relay
- Phase loss relay
- Emergency stop contact block
- Surge protective device
- Earth fault monitoring device

Differentiate protective-device functions accurately.

Do not treat all protective devices as interchangeable switches.

### Contactors and relays

Implement:

- Three-pole contactor
- Four-pole contactor
- Auxiliary contactor
- AC coil contactor
- DC coil contactor
- Reversing contactor arrangement
- Mechanically interlocked contactors
- NO auxiliary contact
- NC auxiliary contact
- Changeover contact
- Control relay
- Latching relay
- Time-delay relay
- Safety relay abstraction
- Impulse relay
- Intermediate relay

The coil and all mechanically associated contacts must share a common component state.

### Motor components

Implement:

- Single-phase induction motor
- Three-phase induction motor
- Squirrel-cage induction motor
- Wound-rotor motor
- Synchronous motor
- DC motor
- Permanent-magnet DC motor
- Servo motor
- Stepper motor
- Gearmotor
- Reversible motor
- Two-speed motor
- Star-delta motor configuration
- Motor with brake
- Motor with thermal sensor
- Motor with encoder
- Variable-speed drive motor configuration

Support multiple parameterized ratings and operating configurations.

Do not invent detailed physical motor models without equations and verification.

### Switches and control devices

Include:

- NO pushbutton
- NC pushbutton
- Maintained pushbutton
- Emergency stop
- Selector switch
- Key switch
- Rotary switch
- Limit switch
- Foot switch
- Float switch
- Pressure switch
- Temperature switch
- Proximity switch
- Photoelectric switch
- Door interlock switch
- Manual changeover switch

### Sensors

Include:

- Inductive proximity sensor
- Capacitive proximity sensor
- Optical sensor
- Ultrasonic sensor
- Temperature sensor
- Pressure transducer
- Level sensor
- Flow sensor
- Position sensor
- Encoder
- Current sensor
- Voltage sensor
- Speed sensor
- Vibration sensor
- Motor thermal sensor

### PLC and automation

Include:

- PLC CPU abstraction
- Digital input module
- Digital output module
- Analog input module
- Analog output module
- Relay output module
- Transistor output module
- 24 V DC input
- 24 V DC output
- PLC power supply
- PLC terminal modules
- Remote I/O abstraction
- HMI signal interface
- Interposing relay
- Control signal converter

A PLC component must have an actual executable logic model when advertised as programmable.

### Additional components

Support transformers, rectifiers, power supplies, indicator lamps, buzzers, solenoids, valves, heaters, fans, resistive loads, terminal blocks, connectors, cable cores, busbars, measuring instruments and industrial drive abstractions.

Each catalog category must include meaningful variation in topology, terminal configuration, electrical function or supported rating.

# PART 7 — SMART ELECTRICAL WIRING ENGINE

The application must not treat electrical wires as decorative lines.

Implement an electrical connectivity graph.

Every wire must connect electrical terminals or explicitly defined junctions.

Each terminal must have:

- Unique ID
- Parent component ID
- Terminal label
- Electrical type
- Permitted connection types
- Position
- Orientation
- Connection state

### Wiring functionality

- Click-to-wire
- Drag-to-wire
- Orthogonal routing
- Multi-segment wiring
- Wire endpoint snapping
- Automatic junction creation where appropriate
- Explicit connected/unconnected crossing behavior
- Wire continuation
- Wire splitting
- Wire merging
- Wire deletion
- Wire reconnection
- Wire numbering
- Net naming
- Cable grouping
- Terminal numbering
- Connectivity highlighting
- Wire color configuration
- Cross-sheet connections
- Automatic connection validation

Crossing wires must not automatically become connected unless the selected wiring convention or explicit junction requires it.

Wire geometry and electrical topology must be stored separately.

Moving a component must preserve its valid terminal connections.

Undo and redo must preserve electrical connectivity.

# PART 8 — SIMULATION ENGINE

Build a real simulation engine.

Do not implement fake animation that merely changes wire colors after pressing RUN.

Use a layered simulation architecture.

## 8.1 Electrical topology engine

Responsible for:

- Terminal connectivity
- Electrical nets
- Open circuits
- Closed circuits
- Source connections
- Switching paths
- Component state propagation
- Invalid wiring detection

## 8.2 Control logic engine

Responsible for:

- Relay coils
- Contactor coils
- Auxiliary contacts
- Pushbuttons
- Selector switches
- Timers
- Interlocks
- Control relays
- Sequence logic
- PLC signal interaction

Use deterministic event scheduling.

Implement appropriate state transitions and avoid infinite switching loops.

## 8.3 Electrical calculation engine

Support appropriate validated models for:

- AC voltage
- DC voltage
- Current
- Resistance
- Impedance
- Frequency
- Power
- Power factor
- Three-phase calculations
- Load behavior
- Voltage drops
- Motor operating conditions

Choose numerical methods based on the actual model.

Where suitable, integrate a numerical circuit solver such as ngspice through an appropriate browser-compatible architecture.

Do not assume that a general SPICE engine alone can correctly simulate all industrial protection and motor-control behavior.

## 8.4 Motor simulation

Implement supported motor models with:

- Rated voltage
- Rated current
- Rated power
- Rated frequency
- Efficiency
- Power factor
- Starting current
- Starting torque
- Load torque
- Acceleration
- Running speed
- Stopping behavior
- Phase loss response
- Overload behavior

Distinguish simple educational motor models from detailed validated engineering models.

## 8.5 Protection simulation

Model protection according to supported device characteristics.

Include:

- Overload detection
- Short-circuit detection
- Thermal overload behavior
- Phase loss
- Undervoltage
- Overvoltage
- Invalid supply conditions
- Device trip events
- Manual reset
- Automatic reset where appropriate

Do not imply that simplified simulation establishes real-world protective coordination or electrical installation safety.

# PART 9 — LIVE INTERACTIVE SIMULATION

During simulation, users must be able to operate:

- START pushbutton
- STOP pushbutton
- Emergency stop
- Circuit breaker
- Isolator
- Selector switch
- Relay
- Contactor
- Timer
- Manual switch
- Fault injection controls

Display:

- Energized conductors
- De-energized conductors
- Actual connection states
- Contactor status
- Relay status
- Motor status
- Voltage measurements
- Current measurements
- Fault conditions
- Protection trips
- Simulation time
- Event history

Use accessible visual distinctions and labels.

For example:

1. User closes the main circuit breaker.
2. Valid supply becomes available.
3. User presses START.
4. Control coil receives its required voltage.
5. Contactor closes after its configured delay.
6. Associated auxiliary contacts change state.
7. Motor receives supply.
8. Motor accelerates according to its model.
9. User presses STOP.
10. Contactor opens.
11. Motor supply is removed.
12. Motor decelerates according to its model.

Every transition must follow electrical connectivity and modeled behavior.

# PART 10 — REQUIRED MOTOR CONTROL APPLICATIONS

Implement and verify:

- Direct-On-Line motor starter
- Three-wire START/STOP control
- Two-wire motor control
- Contactor holding circuit
- Forward/reverse motor control
- Electrical interlocking
- Mechanical interlocking
- Star-delta starter
- Automatic star-delta transition
- Manual star-delta control
- Two-speed motor control
- Sequential motor starting
- Alternating motor operation
- Duty/standby motor control
- Pump control
- Tank filling control
- Tank emptying control
- Conveyor control
- Compressor control
- Fan control
- Motor overload protection
- Phase failure protection
- Motor undervoltage control
- Timed motor starting
- Delayed motor stopping
- Emergency stop demonstration
- PLC-operated motor starter
- Sensor-controlled motor starter
- Multiple motor control
- Motor fault diagnosis

All examples must contain executable circuit data, not screenshots.

# PART 11 — 500 READY-MADE PROJECTS

Create a minimum of **500 distinct, runnable and individually tested electrical engineering projects**.

Every project must include:

- Unique project ID
- Title
- Difficulty level
- Description
- Learning objectives
- Circuit schematic
- Component list
- Electrical connections
- Component parameters
- Simulation settings
- Expected operating behavior
- User operating instructions
- Fault scenarios where relevant
- Expected measurements
- Automated verification assertions
- Project validation result

The project must open directly inside AdigunElectroCAD.

The user must be able to inspect, modify, run, save and export it.

A project is not complete if it consists only of a title, description, image or empty drawing.

## Project distribution

| Level | Projects |
|---|---:|
| Beginner | 100 |
| Intermediate | 125 |
| Advanced | 125 |
| Industrial professional | 100 |
| Expert / integrated systems | 50 |
| **Total** | **500** |

### Beginner: Projects 001–100

Cover:

- Basic AC supply
- Basic DC supply
- Single lamp
- Two lamps
- Series circuit
- Parallel circuit
- Switch-controlled lamp
- NO contact operation
- NC contact operation
- Pushbutton operation
- Relay coil
- Relay contact
- Indicator lamp
- Buzzer
- Fuse
- Circuit breaker
- Basic contactor
- Single-phase motor
- Three-phase motor
- Simple control transformer

Expand into 100 individually meaningful projects with different electrical learning objectives.

### Intermediate: Projects 101–225

Cover:

- START/STOP control
- Seal-in circuit
- Motor starter
- Overload relay
- Forward/reverse control
- Interlocking
- Timer control
- Sequential control
- Pump automation
- Tank level control
- Fan automation
- Conveyor starter
- Phase monitoring
- Control transformer circuits
- Multiple indicator systems
- Basic PLC input/output wiring
- Motor fault detection

### Advanced: Projects 226–350

Cover:

- Star-delta control
- Multiple motor coordination
- Automatic transfer control
- Three-phase distribution
- Motor protection coordination demonstrations
- PLC-controlled conveyors
- Sensor-controlled production sequences
- Multi-pump automation
- Duty/standby systems
- Motor reversing sequences
- Timed production systems
- Fault monitoring
- Electrical measurement systems
- Drive-control interfaces

### Industrial professional: Projects 351–450

Cover:

- Industrial pump stations
- Conveyor production lines
- Motor control centers
- Industrial ventilation
- Water treatment control
- Automated packaging sequences
- Industrial compressor control
- Multi-motor production systems
- Machine interlocking
- Industrial distribution panels
- Electrical fault diagnosis
- Process control interfaces

### Expert: Projects 451–500

Cover:

- Integrated industrial automation systems
- Multi-sheet motor control centers
- PLC and electrical power-circuit integration
- Industrial process sequences
- Fault-tolerant control demonstrations
- Multi-drive systems
- Automated plant operations
- Electrical monitoring and diagnostics
- Complex motor protection scenarios
- Multi-stage industrial machinery

Generate projects from validated engineering specifications, not by random component placement.

Every project must have meaningful differences.

Maintain a machine-readable project verification manifest.

A project may only be labeled **Tested** after its actual automated tests pass.

# PART 12 — PROJECT LIBRARY INTERFACE

Provide:

- Project search
- Difficulty filters
- Category filters
- Component filters
- Beginner-to-expert progression
- Project preview
- Open Project
- Duplicate Project
- Save As
- Favorite Project
- Project instructions
- Expected results
- Run verification
- Export Project

Projects must load through the same native schema used by the CAD editor.

No special hardcoded demo-only rendering.

# PART 13 — PLC AND LADDER LOGIC INTEGRATION

Provide PLC integration as a separate but connected module.

The electrical power-circuit editor remains the primary product.

Implement:

- PLC hardware symbols
- PLC power terminals
- Digital input terminals
- Digital output terminals
- Analog input/output abstractions
- Input/output addressing
- Variable mapping
- PLC wiring
- Basic Ladder Logic editor
- NO and NC logical contacts
- Output coils
- Timers
- Counters
- Set/reset functions
- Program execution
- Online-style monitoring of simulated logic
- PLC-to-contactor control

The Ladder Logic engine must interact with the electrical circuit through defined PLC I/O signals.

Do not confuse graphical Ladder Logic contacts with physical power contacts.

Do not claim compatibility with actual Siemens, Schneider, ABB or other proprietary PLC programming environments without verified interoperability.

# PART 14 — COMPONENT AND SYMBOL EDITOR

Allow advanced users to create custom components.

Provide:

- Symbol drawing
- Terminal placement
- Terminal naming
- Symbol rotation
- Symbol mirroring
- Electrical property definitions
- Contact configurations
- Simulation model assignment
- Component validation
- Custom library storage
- Import/export of custom components

Validate symbols and terminal definitions before allowing them into executable circuits.

# PART 15 — ENGINEERING STANDARDS

Use applicable standards as design references, including:

- IEC 60617 for graphical electrical symbols
- IEC 61082 for electrotechnical documentation
- IEC 81346 for reference designation principles
- IEC 60947 for relevant low-voltage switching and control equipment
- IEC 60204-1 for relevant electrical equipment of machinery
- IEC 61131-3 for PLC programming language concepts
- IEC 60898-1 where relevant to circuit breakers
- IEC 61439 where relevant to low-voltage assemblies
- EN/DIN national adoption where applicable

Verify current applicability and licensing before implementing or claiming compliance.

Do not copy proprietary symbol libraries, commercial documentation or protected standards text without permission.

Use independently implemented symbols and appropriate engineering conventions.

Never claim certification, regulatory compliance or installation approval merely because a schematic passes software validation.

# PART 16 — MEASUREMENT AND TESTING TOOLS

Implement usable virtual instruments:

### Multimeter
- AC voltage
- DC voltage
- Current
- Resistance where supported
- Continuity

### Current measurement
- Current probe
- Phase current
- Load current
- Motor current

### Voltage measurement
- Phase-to-phase voltage
- Phase-to-neutral voltage
- DC voltage
- Terminal voltage

### Power measurement
- Active power
- Reactive power where supported
- Apparent power
- Power factor

### Additional tools
- Oscilloscope
- Event recorder
- Motor speed indicator
- Motor load indicator
- Thermal state indicator
- Fault recorder
- Connection continuity inspector

Only show measurements the selected simulation model can actually calculate.

# PART 17 — ELECTRICAL VALIDATION

Implement a validation engine capable of identifying:

- Unconnected terminals
- Invalid source connections
- Missing supply
- Open circuit
- Unsupported component models
- Conflicting source connections
- Incorrect terminal types
- Invalid coil voltage
- Invalid frequency
- Overrated or underrated equipment where modeled
- Missing protective earth connections where required by the model
- Invalid motor supply configuration
- Incorrect phase connections
- Short circuits
- Unsupported simulation configurations
- Contradictory device properties
- Invalid component references
- Duplicate terminal IDs
- Missing project dependencies

Separate validation severity into:

- Information
- Warning
- Error
- Critical simulation-blocking error

Warnings must provide meaningful corrective guidance.

# PART 18 — ADIGUN BOT

Implement a floating, product-aware AI assistant named **Adigun BOT**.

The assistant must use the official shared design-system conventions.

Provide a compact floating launcher that opens a resizable, accessible assistant panel.

## AI capabilities

Adigun BOT should support:

- Explaining electrical components
- Explaining electrical symbols
- Explaining terminal numbering
- Explaining contactor operation
- Explaining motor starter circuits
- Explaining relay logic
- Explaining PLC wiring
- Reviewing a selected schematic
- Identifying possible wiring mistakes
- Explaining simulation results
- Explaining electrical faults
- Suggesting suitable project examples
- Guiding beginners step by step
- Explaining advanced industrial circuits
- Helping users locate components
- Helping users understand measurement results

## AI-assisted circuit creation

Allow users to request:

"Create a three-phase DOL motor starter with START, STOP and overload protection."

The assistant should generate a structured circuit proposal using the native project schema.

Before insertion:

1. Validate the requested components.
2. Validate terminal definitions.
3. Validate wiring topology.
4. Check simulation-model support.
5. Show the proposed schematic.
6. Request user confirmation.
7. Insert the circuit.
8. Allow undo.
9. Report any unsupported features.

Never allow the AI to silently modify existing projects.

Never expose secret AI API keys in GitHub Pages frontend code.

Use a secure backend or user-controlled provider configuration where appropriate.

If a real AI provider is not configured, display an honest configuration state. Do not present a scripted chatbot as a working AI assistant.

# PART 19 — LANGUAGE SETTINGS

Implement complete internationalization for:

1. English — `en`
2. German — `de`
3. Yoruba — `yo`
4. Nigerian Pidgin — `pcm`

Use English as the initial default unless the verified global design system specifies otherwise.

Persist the selected language.

Translate:

- Navigation
- Menus
- Buttons
- Tooltips
- Dialogs
- Error messages
- Simulation controls
- Component descriptions
- Project instructions
- Help content
- AI interface
- Settings
- Reports where supported

Use proper language fallback behavior.

Do not translate electrical identifiers, standard terminal numbers or manufacturer model numbers.

Preserve engineering terminology where translation would create ambiguity.

Test for long German text, special characters and responsive overflow.

Do not ship incomplete translations as complete.

# PART 20 — THEMES AND ACCESSIBILITY

Implement:

- Light theme
- Dark theme
- System theme
- Persistent theme preference
- High-contrast engineering indicators
- Keyboard navigation
- Accessible labels
- Visible focus states
- Screen-reader-friendly controls
- Reduced-motion support
- Adjustable canvas grid
- Configurable wire colors
- Resizable panels

Keep electrical drawing contrast high in both light and dark themes.

Use professional engineering typography, spacing and icons.

Avoid decorative animations that reduce CAD performance.

# PART 21 — RESPONSIVE DESIGN

The software must support:

- Desktop monitors
- Wide engineering workstations
- Laptops
- Tablets
- Mobile browsers

Prioritize desktop engineering workflows.

On small screens, use collapsible panels, compact toolbars and touch-friendly controls.

Do not shrink the entire desktop application into an unusable miniature.

Provide clear mobile limitations for precision CAD operations that require a keyboard or mouse.

Ensure no horizontal page overflow, overlapping headers, clipped dialogs or inaccessible buttons.

# PART 22 — PROJECT SAVE, IMPORT AND EXPORT

Implement:

- New Project
- Open Project
- Save Project
- Save As
- Local autosave
- Crash recovery
- Import JSON
- Export JSON
- Export SVG
- Export PNG
- Export PDF
- Print schematic
- Project backup
- Project versioning

Use a versioned native project schema.

Store component instances, symbols, terminals, nets, wires, pages, settings, simulation parameters and metadata.

Validate imported files.

Never execute code embedded in imported project data.

Support migration between compatible schema versions.

Cloud saving may be added through a secure backend if enabled and authorized.

The core editor and local project saving must not depend on user authentication.

# PART 23 — AUTHENTICATION AND CLOUD FEATURES

GitHub Pages is a static hosting platform.

Do not assume GitHub Pages provides a backend database, authentication service, secure AI API proxy or server-side simulation.

If cloud accounts are implemented, use an explicitly configured external backend.

Possible features:

- Email/password authentication
- User profile
- Avatar
- Private projects
- Cloud save
- Project synchronization
- Guest projects
- Guest-to-account project recovery
- Secure account deletion

Enforce owner-scoped access on the backend.

Never trust client-side role labels for administrator authorization.

Do not ship credentials or service-role secrets in public frontend files.

# PART 24 — TECHNICAL ARCHITECTURE

Preferred stack:

- React
- TypeScript
- Vite
- SVG-based schematic rendering
- CSS design tokens
- Modular state management
- Typed component definitions
- Graph-based electrical connectivity model
- Deterministic event-driven control simulator
- Numerical simulation where appropriate
- Web Workers
- WebAssembly for suitable compute-intensive modules
- IndexedDB for local project persistence
- Vitest for unit/integration tests
- Playwright for end-to-end testing
- GitHub Actions
- GitHub Pages

Select libraries based on actual engineering requirements, compatibility, licensing and maintenance status.

Do not install unnecessary dependencies.

Do not use an ordinary flowchart library as a substitute for a proper electrical CAD topology engine unless its limitations have been addressed.

## Architectural separation

Maintain independent modules for:

1. UI and design system.
2. CAD canvas.
3. Symbol rendering.
4. Component catalog.
5. Terminal definitions.
6. Wiring and connectivity.
7. Electrical validation.
8. Simulation.
9. Measurement.
10. PLC integration.
11. Project storage.
12. Import/export.
13. AI integration.
14. Internationalization.
15. Reports.
16. Testing.

The simulation engine must not depend on visual SVG positions.

Electrical connectivity must remain valid when symbols are moved.

# PART 25 — SUGGESTED REPOSITORY STRUCTURE

```text
AdigunElectroCAD/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── public/
│   ├── assets/
│   └── icons/
├── src/
│   ├── app/
│   ├── components/
│   ├── layouts/
│   ├── design-system/
│   ├── cad/
│   │   ├── canvas/
│   │   ├── symbols/
│   │   ├── wiring/
│   │   ├── terminals/
│   │   ├── selection/
│   │   └── tools/
│   ├── electrical/
│   │   ├── models/
│   │   ├── topology/
│   │   └── validation/
│   ├── simulation/
│   │   ├── engine/
│   │   ├── control/
│   │   ├── power/
│   │   ├── motors/
│   │   ├── protection/
│   │   └── measurements/
│   ├── plc/
│   ├── catalog/
│   ├── projects/
│   ├── instruments/
│   ├── ai/
│   ├── reports/
│   ├── storage/
│   ├── import-export/
│   ├── i18n/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── styles/
├── data/
│   ├── components/
│   ├── symbols/
│   ├── simulation-models/
│   └── example-projects/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── simulation/
│   ├── catalog/
│   ├── projects/
│   ├── e2e/
│   └── regression/
├── docs/
│   ├── architecture/
│   ├── engineering/
│   ├── components/
│   ├── simulation/
│   ├── tutorials/
│   └── validation/
├── scripts/
├── README.md
├── AGENTS.md
├── package.json
├── vite.config.ts
└── tsconfig.json
```

Adapt the structure to the actual implementation without collapsing all logic into a single enormous file.

# PART 26 — ENGINEERING ACCURACY

Engineering correctness is mandatory.

Do not fake:

- Voltage
- Current
- Motor speed
- Contactor operation
- Protective trips
- Short circuits
- Relay behavior
- Timer operation
- PLC behavior
- Measurement results

Where a model is simplified, state the simplification.

Distinguish:

- Symbol supported
- Wiring supported
- Logic simulation supported
- Numerical simulation supported
- Fully validated model

Maintain traceability between model equations, reference assumptions and automated tests.

Use independently calculated reference cases for verification.

Include simulation limitations in the documentation.

The application is an engineering design and education tool, not an automatic certification of real electrical installations.

# PART 27 — PERFORMANCE REQUIREMENTS

Set measurable performance targets and verify them on documented test hardware.

Targets should include:

- Responsive component placement
- Smooth pan and zoom
- Efficient wire rendering
- Fast selection
- Bounded simulation event processing
- Reliable autosave
- Efficient large-project loading
- No uncontrolled memory growth
- No blocking UI during heavy calculations

Test drawings containing:

- 50 components
- 100 components
- 250 components
- 500 components
- 1,000 components

Record actual performance measurements.

Do not report performance targets as achieved unless measured.

Use virtualization, caching and background computation where justified.

# PART 28 — SECURITY REQUIREMENTS

Implement:

- Strict TypeScript
- Input validation
- Safe JSON parsing
- Dependency auditing
- Content security considerations
- Secure external links
- Protection against script injection
- Safe imported-project handling
- AI tool permission checks
- No exposed secrets
- Secure authentication if enabled
- Secure backend authorization if enabled
- Safe file handling
- Controlled resource consumption

Treat imported project data and AI-generated circuit data as untrusted until validated.

# PART 29 — TESTING REQUIREMENTS

Create automated tests for:

### CAD
- Component placement
- Component movement
- Rotation
- Mirroring
- Terminal snapping
- Wire creation
- Wire deletion
- Junction behavior
- Undo/redo
- Copy/paste
- Save/load

### Electrical
- Netlist generation
- Source connectivity
- Contact switching
- Relay energization
- Contactor state
- Auxiliary contacts
- Open circuit detection
- Short circuit detection
- Motor connections
- Protection states

### Simulation
- START/STOP behavior
- Holding circuit
- Motor startup
- Motor stopping
- Timer operation
- Relay operation
- Fault injection
- Protection trips
- Measurement consistency
- Deterministic results

### Catalog
- Minimum 500 valid catalog entries
- Unique IDs
- Valid symbols
- Valid terminal definitions
- Valid properties
- Simulation compatibility
- Schema validation

### Projects
- Minimum 500 project files
- Every project opens
- Every project validates
- Every project runs using its supported model
- Every project has expected assertions
- Every project produces its expected results
- No missing component dependencies

### UI
- Header
- Footer
- Menus
- Toolbars
- Theme switching
- Language switching
- Responsive layout
- Keyboard shortcuts
- Dialogs
- Panel resizing
- Accessibility

### Deployment
- Production build
- Asset loading
- Deep links
- Correct base path
- No blank screen
- No broken imports
- No missing CSS
- No missing symbols
- No browser console errors during standard workflows

Do not report a test as passed without executing it.

# PART 30 — GITHUB PAGES DEPLOYMENT

Target repository:

`HephzibahBehulahHQ/AdigunElectroCAD`

Target URL:

https://hephzibahbehulahhq.github.io/AdigunElectroCAD/

Configure the application for the exact GitHub Pages repository base path:

`/AdigunElectroCAD/`

Ensure:

- Correct Vite base configuration
- Correct asset paths
- Correct navigation paths
- Correct static hosting behavior
- Compatible client-side routing
- Working production build
- Automated deployment workflow
- GitHub Pages configuration
- Build validation before deployment

Do not assume that GitHub Pages automatically supports backend APIs.

Do not claim deployment succeeded until the actual published application has been checked.

# PART 31 — HEADER AND FOOTER REQUIREMENTS

Use the verified official design-system header and footer conventions.

The header must remain compact because the CAD workspace is the primary application.

The footer should include appropriate:

- Hephzibah Behulah identity
- HB Elektroniker identity
- Product name
- Copyright information
- Documentation link
- Privacy information
- Terms where applicable
- GitHub link
- Version information

Use verified links only.

Avoid an oversized website footer that consumes engineering workspace space.

Use an application-friendly footer or status bar with access to corporate information.

# PART 32 — DEVELOPMENT EXECUTION PLAN

Implement the application incrementally.

## Phase 0 — Repository and requirements audit

- Inspect all reference repositories.
- Inspect the target repository.
- Review branding.
- Review the attached image.
- Record technical constraints.
- Define architecture.
- Establish acceptance criteria.
- Create a development plan.

Deliverable: documented architecture and verified project setup.

## Phase 1 — Working application shell

- Initialize application.
- Implement design-system tokens.
- Implement header.
- Implement footer/status bar.
- Implement menus.
- Implement theme selector.
- Implement language selector.
- Implement responsive workspace.
- Configure GitHub Pages.

Deliverable: working branded application shell.

## Phase 2 — Electrical CAD editor

- Implement canvas.
- Implement symbols.
- Implement terminal model.
- Implement component placement.
- Implement wiring.
- Implement junctions.
- Implement property editing.
- Implement undo/redo.
- Implement save/load.

Deliverable: usable electrical schematic editor.

## Phase 3 — Functional control simulation

- Implement connectivity engine.
- Implement switching logic.
- Implement relay logic.
- Implement contactor logic.
- Implement control circuits.
- Implement interactive controls.
- Implement simulation status and events.

Deliverable: working control-circuit simulation.

## Phase 4 — Power circuit simulation

- Implement supported AC/DC source models.
- Implement three-phase connectivity.
- Implement motor models.
- Implement protection models.
- Implement electrical calculations.
- Implement measurement tools.
- Implement fault injection.

Deliverable: working power-circuit simulator.

## Phase 5 — Complete component catalog

- Implement and verify 520+ catalog entries.
- Complete symbol definitions.
- Complete terminal models.
- Complete component properties.
- Complete supported simulation models.
- Execute catalog validation.

Deliverable: verified industrial component library.

## Phase 6 — Complete project library

- Implement 100 beginner projects.
- Implement 125 intermediate projects.
- Implement 125 advanced projects.
- Implement 100 industrial professional projects.
- Implement 50 expert projects.
- Validate all 500 individually.

Deliverable: complete verified project library.

## Phase 7 — Advanced engineering tools

- PLC integration.
- Ladder Logic integration.
- Instruments.
- Reports.
- Custom component editor.
- Multi-sheet engineering.
- Project validation.

Deliverable: integrated engineering environment.

## Phase 8 — Adigun BOT

- Implement assistant interface.
- Configure secure provider architecture.
- Implement product-aware tools.
- Implement circuit analysis.
- Implement validated circuit generation.
- Implement confirmation and undo.

Deliverable: working AI engineering assistant where configured.

## Phase 9 — Quality assurance

- Run unit tests.
- Run integration tests.
- Run simulation tests.
- Run catalog tests.
- Run all 500 project tests.
- Run accessibility tests.
- Run responsive tests.
- Run performance tests.
- Run security checks.
- Fix confirmed defects.
- Repeat regression testing.

Deliverable: documented quality report with real results.

## Phase 10 — Production deployment

- Build production application.
- Verify GitHub Pages configuration.
- Deploy through approved workflow.
- Verify published URL.
- Test deployed application.
- Verify assets and navigation.
- Verify example projects.
- Verify save/load.
- Verify simulation.
- Verify language and theme settings.

Deliverable: published, verified application.

# PART 33 — FIRST REQUIRED WORKING EXAMPLE

Before expanding to hundreds of components and projects, implement a fully working three-phase DOL motor starter.

The circuit must include:

- Three-phase supply
- Protective switching device
- Main contactor
- Thermal overload relay
- Three-phase motor
- START pushbutton
- STOP pushbutton
- Contactor auxiliary holding contact
- Contactor coil
- Overload NC auxiliary contact
- Protective earth connection representation

Required behavior:

1. Main supply is initially disconnected.
2. User closes the main protective switching device.
3. Control supply becomes available.
4. User presses START.
5. The contactor coil energizes.
6. Main contacts close.
7. Motor receives three-phase supply.
8. Motor begins running.
9. Auxiliary holding contact maintains the coil circuit after START is released.
10. User presses STOP.
11. Contactor coil de-energizes.
12. Main contacts open.
13. Motor loses supply and decelerates.
14. Overload trip must interrupt the relevant control path.
15. Fault and reset behavior must follow the implemented protection model.

Implement this as a genuine editable circuit.

It must use the same component catalog, terminal model, wiring engine and simulation engine that other projects use.

This example is the minimum technical proof that AdigunElectroCAD is functioning as intended.

# PART 34 — ACCEPTANCE CRITERIA

The project cannot be declared fully complete until:

- The application loads at the target production URL.
- The official branding is implemented correctly.
- The CAD workspace is usable.
- Electrical symbols are correctly rendered.
- Components have functional terminals.
- Wires create actual electrical connections.
- Simulation follows the electrical model.
- Contactors and relays operate correctly.
- Motor-control demonstrations work.
- Electrical measurements are calculated from supported models.
- Fault detection works.
- Project save/load works.
- Import/export works.
- Four-language support is complete.
- Theme switching works.
- Menus and toolbars work.
- At least 500 functional component entries are verified.
- At least 500 runnable project examples are individually verified.
- Adigun BOT functionality is honestly represented and tested where configured.
- Automated tests pass.
- Production build succeeds.
- Deployment is verified.
- Documentation is complete.
- Known limitations are disclosed.

Do not use the words "complete", "fully tested" or "production ready" for requirements that remain unfinished or unverified.

# PART 35 — NON-NEGOTIABLE ENGINEERING RULES

1. No dummy electrical components.
2. No fake simulation.
3. No decorative-only wiring.
4. No nonfunctional buttons presented as functional.
5. No duplicate component IDs.
6. No fabricated manufacturer specifications.
7. No invented test results.
8. No fake AI integration.
9. No missing electrical terminals.
10. No unsupported electrical calculations presented as accurate.
11. No hidden simulation failures.
12. No silently disconnected wires.
13. No accidental electrical junctions.
14. No broken save/load behavior.
15. No unvalidated imported projects.
16. No missing translation keys presented as complete localization.
17. No broken mobile layouts.
18. No overlapping toolbars or panels.
19. No unauthorized changes to other repositories.
20. No destructive Git operations.
21. No exposed secrets.
22. No deployment claims without verification.
23. No fake standards certification.
24. No counting duplicate component variants as unique models without meaningful differences.
25. No counting empty project templates as tested projects.

# PART 36 — AGENT WORKFLOW AND TOKEN DISCIPLINE

Do not repeatedly paste this specification into responses.

Use it as the authoritative project requirements document.

Work directly on the actual repository.

At each stage:

1. Inspect relevant existing files.
2. Implement the required change.
3. Run appropriate tests.
4. Fix failures.
5. Record what changed.
6. Commit coherent changes when authorized.
7. Continue to the next dependent task.

Do not rewrite unrelated files.

Do not generate enormous unreviewed batches of components or projects.

Use schema validation and automated generation only where engineering definitions and test coverage justify it.

Maintain a requirements checklist and verification manifest.

Use concise progress reporting:

STATUS

Done:
- Actual files, features or changes completed.

Tested:
- Tests executed.
- Passed/failed counts.
- Remaining failures.

Next:
- Immediate next implementation step.

Blocked:
- Only genuine blockers, including missing credentials, permissions, licensed assets or unresolved engineering requirements.

Do not claim success based on assumptions.

# PART 37 — FINAL DELIVERABLES

Deliver:

1. Complete AdigunElectroCAD source repository.
2. Working browser-based electrical CAD editor.
3. Functional electrical wiring engine.
4. Functional control and power simulation for supported models.
5. Minimum 500 verified industrial component entries.
6. Minimum 500 verified runnable example projects.
7. Electrical measurement tools.
8. PLC integration.
9. Ladder Logic integration.
10. Project saving and recovery.
11. Import/export functionality.
12. Engineering reports.
13. Four-language interface.
14. Official branding and design-system integration.
15. Secure Adigun BOT integration where configured.
16. Automated test suite.
17. Test coverage and validation reports.
18. Engineering documentation.
19. User manual.
20. Developer documentation.
21. GitHub Actions deployment.
22. Verified GitHub Pages application.
23. Known limitations and supported-model documentation.
24. Future enhancement roadmap.

# PART 38 — FINAL EXECUTION INSTRUCTION

Begin by auditing the three official reference repositories and the AdigunElectroCAD target repository.

Study the attached electrical power-circuit image.

Implement the actual electrical CAD and simulation application, not a visual imitation.

Prioritize a fully functional schematic editor and validated DOL motor starter before expanding to the complete component and project libraries.

Preserve the official Hephzibah Behulah visual identity and HB Elektroniker branding.

Use the actual shared design-system assets and tokens.

Build incrementally, test continuously and verify every advertised feature.

The ultimate objective is a professional browser-based engineering environment where an electrician can draw an industrial power circuit like the reference image, wire its components, press RUN, operate the circuit, observe realistic modeled electrical behavior, diagnose faults, inspect measurements and export usable engineering documentation.

The 500+ components and 500 projects are mandatory release targets, not permission to fabricate untested data.

If the entire scope cannot be completed in one execution session, preserve the verified working state, document remaining requirements and continue in subsequent implementation sessions without falsely declaring completion.

**Build AdigunElectroCAD as a genuine electrical engineering application, from initial repository audit through verified production deployment.**




# ADDENDUM A — ADIGUNELECTROCAD INDUSTRIAL COMPONENT LIBRARY, IEC SYMBOL DESIGN, ELECTRICAL WIRING AND LIVE SIMULATION SPECIFICATION

**Project:** AdigunElectroCAD  
**Repository:** `HephzibahBehulahHQ/AdigunElectroCAD`  
**Production:** https://hephzibahbehulahhq.github.io/AdigunElectroCAD/  
**Status:** Mandatory extension to the Master Development Specification

## A1. Primary engineering requirement

The attached electrical power-circuit image is the principal reference for how industrial electrical components must appear inside the schematic editor.

AdigunElectroCAD must behave like a professional electrical schematic CAD application, not a drag-and-drop illustration program.

The user must be able to:

1. Select an electrical component from the library.
2. Place its standard electrical symbol on the drawing canvas.
3. Rotate or mirror the component.
4. Connect wires directly to numbered electrical terminals.
5. Configure its electrical ratings and operating properties.
6. Connect multiple components into a complete circuit.
7. Start the simulation.
8. Operate switches, pushbuttons, relays and contactors.
9. Observe the actual modeled electrical behavior.
10. Inspect electrical measurements, faults and operating states.

**Every component must have three separate representations:**

- **Schematic symbol:** The IEC-style electrical symbol displayed on the circuit drawing.
- **Physical component preview:** A photograph, illustration or 3D representation where an appropriate verified asset is available.
- **Simulation model:** The electrical or electromechanical behavior used by the simulation engine.

A physical component photograph must never replace its schematic symbol on the drawing canvas.

The schematic symbol is the primary representation.

---

# A2. Mandatory schematic drawing appearance

Reproduce the professional technical drawing conventions visible in the reference image.

## Drawing canvas

The canvas must provide:

- White or ivory engineering background in light mode.
- High-contrast dark engineering background in dark mode.
- Optional fine engineering grid.
- Thin, precise schematic lines.
- Standardized symbol proportions.
- Orthogonal horizontal and vertical conductors.
- Clear terminal labels.
- Clear component identifiers.
- Visible electrical junction dots.
- Correct wire crossings.
- Consistent spacing.
- Professional technical typography.
- Zoom-independent line readability.
- Printable monochrome drawing mode.

Symbols must be vector-based, preferably SVG or another scalable vector representation.

Avoid decorative icons, emojis, oversized equipment illustrations, inconsistent line thicknesses or cartoon-like electrical symbols inside the schematic canvas.

## Drawing rules

- Use consistent terminal spacing.
- Use configurable symbol scale.
- Keep component identifiers near their associated symbols.
- Keep terminal numbers close to connection points.
- Maintain electrical connections when components move.
- Allow 90-degree rotations.
- Support mirroring where electrically and graphically appropriate.
- Preserve readable labels during transformations.
- Maintain symbol geometry independently of simulation state.

Electrical symbols must follow applicable IEC 60617 conventions where appropriate and legally implementable.

Use independently authored symbols. Do not copy proprietary commercial CAD libraries without permission.

---

# A3. Detailed interpretation of the reference image

The original image depicts an industrial electrical power-circuit schematic containing a single-phase motor and a three-phase motor.

The agent must reproduce the recognizable appearance of the following elements.

## A3.1 Three-phase power supply

**Visible labels:**

- L1
- L2
- L3
- PE

**Drawing appearance:**

- Four vertical conductor connection positions.
- Three phase supply connection points.
- One protective-earth connection point.
- Labels above each conductor.
- Small circular terminal markers where appropriate.
- Straight conductors running downward into switching devices.

**Behavior:**

The source must provide a configurable three-phase AC supply.

Parameters:

- Line-to-line voltage
- Line-to-neutral voltage where a neutral is provided
- Frequency
- Phase sequence
- Source impedance
- Grounding configuration
- Enabled/disabled state

Typical configurable European supply example:

- 400 V line-to-line
- 230 V line-to-neutral
- 50 Hz

Do not assume that PE is a current-carrying supply phase.

PE must be modeled separately as a protective conductor.

## A3.2 Three-pole switching device

**Drawing appearance:**

Three mechanically associated switching contacts, arranged side by side.

Each pole has an upper and lower terminal.

A mechanical association is indicated according to the selected symbol convention.

**Required behavior:**

- All three poles operate together.
- Open state disconnects the downstream power circuit.
- Closed state connects the downstream power circuit.
- The component's state must affect the actual electrical network.

The precise symbol and operating behavior must depend on whether the component is an isolator, circuit breaker, switch disconnector or other device.

Do not use one generic symbol and simulation model for all protective devices.

## A3.3 Three-pole contactor

**Reference designation:** KM1, KM2 or another valid project-specific designation.

**Drawing appearance:**

Three normally open power contacts arranged vertically beneath the supply conductors.

Each contact must have two numbered terminals.

Preferred contactor power-terminal labels:

- 1/L1 → 2/T1
- 3/L2 → 4/T2
- 5/L3 → 6/T3

The contactor coil is a separate schematic symbol, normally placed on the control-circuit sheet.

Preferred coil terminals:

- A1
- A2

Auxiliary contacts:

- 13–14: NO
- 21–22: NC

Additional auxiliary contacts must use appropriate terminal numbering.

**Behavior:**

- Coil energized: associated NO contacts close.
- Coil energized: associated NC contacts open.
- Coil de-energized: contacts return according to their mechanical configuration.
- All linked contacts share the same contactor instance.
- Support configurable pickup and dropout delays.
- Support supported coil voltage and frequency ratings.

## A3.4 Thermal overload relay

**Drawing appearance:**

Three current-carrying paths associated with a common thermal overload device.

Provide an associated normally closed auxiliary trip contact.

Common auxiliary terminals:

- 95–96: NC trip contact
- 97–98: NO trip indication contact

**Behavior:**

- Monitor motor current according to the selected thermal model.
- Accumulate thermal state.
- Trip according to configured characteristics.
- Change auxiliary contact states.
- Interrupt the control circuit when wired accordingly.
- Support reset behavior.

Do not represent thermal overload operation as a fixed instantaneous current threshold unless explicitly using a simplified educational model.

## A3.5 Single-phase motor

**Reference designation:** M1.

**Drawing appearance:**

- Circular motor symbol.
- Capital letter M inside.
- `1~` indicating single-phase AC.
- Electrical connection terminals.
- Protective-earth connection where required.

**Behavior:**

Support a parameterized single-phase motor model.

Where applicable, represent start/run winding arrangements, capacitor connections and operating behavior according to the selected motor type.

Do not use three-phase motor assumptions for single-phase motors.

## A3.6 Three-phase motor

**Reference designation:** M2.

**Drawing appearance:**

- Circular motor symbol.
- Capital letter M inside.
- `3~` indicating three-phase AC.
- Three supply terminals above the symbol.
- PE connection to the motor frame.

Terminal labels:

- U1
- V1
- W1
- PE

For six-terminal motor configurations, additionally support:

- U2
- V2
- W2

**Behavior:**

- Detect valid three-phase supply.
- Determine applicable operating state.
- Calculate modeled current.
- Calculate modeled electrical power.
- Model startup and stopping.
- Support phase loss.
- Support overload conditions.
- Support forward/reverse phase sequence effects where modeled.

## A3.7 Protective-earth conductor

**Drawing appearance:**

- Dedicated PE conductor.
- PE label.
- Connection to equipment protective-earth terminals.
- Configurable green/yellow visual convention.

**Behavior:**

Protective earth must be represented as a distinct electrical network.

Do not treat PE as neutral.

Do not permit the simulation engine to silently merge PE with a phase conductor.

Where grounding and fault-current behavior are modeled, clearly document the supported network assumptions.

---

# A4. Component library categories and required counts

Implement the following minimum catalog.

| Category | Entries |
|---|---:|
| Power sources and supply equipment | 30 |
| Circuit breakers and disconnectors | 40 |
| Fuses and protective devices | 35 |
| Contactors and motor starters | 45 |
| Relays and auxiliary contacts | 45 |
| Switches and pushbuttons | 35 |
| Motors and motor assemblies | 40 |
| Transformers and power conversion | 30 |
| Sensors and limit switches | 35 |
| PLC and industrial control | 35 |
| Timers, counters and control modules | 25 |
| Terminal blocks, connectors and cables | 35 |
| Measuring and indicating devices | 25 |
| Industrial loads and actuators | 35 |
| Power electronics and drives | 30 |
| **Total** | **520** |

These numbers represent minimum catalog targets.

Every entry must be meaningful and independently validated.

Do not count arbitrary cosmetic variations as new components.

---

# A5. Detailed component inventory

## Category 1 — Power sources and supply equipment

Include:

1. Single-phase AC source
2. Three-phase AC source
3. DC voltage source
4. Adjustable AC source
5. Adjustable DC source
6. 12 V DC supply
7. 24 V DC supply
8. 48 V DC supply
9. 110 V DC supply
10. 230 V AC supply
11. 400 V three-phase supply
12. 480 V three-phase supply
13. Battery source
14. Battery bank
15. Industrial DC power supply
16. Switched-mode power supply
17. Linear power supply
18. Control power transformer
19. Isolation transformer supply
20. Three-phase generator
21. Single-phase generator
22. UPS supply
23. Redundant DC supply
24. Dual-output supply
25. Regulated power supply
26. Rectified DC supply
27. Emergency power supply
28. Solar DC source model
29. DC bus source
30. Configurable industrial supply module

Each source must expose correct connection terminals and supported electrical parameters.

## Category 2 — Circuit breakers and disconnectors

Include:

- Single-pole MCB
- Two-pole MCB
- Three-pole MCB
- Four-pole MCB
- Single-pole MCCB
- Three-pole MCCB
- Four-pole MCCB
- Adjustable-trip MCCB
- Motor protection circuit breaker
- Manual motor starter
- Single-pole isolator
- Three-pole isolator
- Four-pole isolator
- Switch disconnector
- Fused switch disconnector
- Load-break switch
- Main switch
- Emergency switching device
- Rotary disconnect switch
- Door-coupled isolator
- Auxiliary contact-equipped breaker
- Shunt-trip breaker
- Undervoltage-release breaker
- Thermal-magnetic breaker
- Electronic-trip breaker
- Residual-current device
- Residual-current breaker with overcurrent protection
- Industrial DC circuit breaker
- Three-phase feeder breaker
- Generator breaker
- Changeover switch
- Manual transfer switch
- Automatic transfer switch abstraction
- Two-pole disconnect switch
- DC isolator
- Motor feeder disconnector
- Distribution feeder breaker
- Control-circuit breaker
- Branch-circuit breaker
- Configurable multipole breaker

Provide appropriate distinctions in operating characteristics, poles, ratings and terminal configuration.

## Category 3 — Fuses and protective devices

Include:

- Cartridge fuse
- Cylindrical fuse
- Blade fuse
- Industrial fuse link
- Motor protection fuse
- Semiconductor protection fuse
- DC fuse
- Fuse holder
- Fuse switch
- Three-pole fuse assembly
- Thermal overload relay
- Electronic overload relay
- Undervoltage relay
- Overvoltage relay
- Phase failure relay
- Phase sequence relay
- Phase imbalance relay
- Frequency monitoring relay
- Earth fault relay
- Residual-current monitoring device
- Surge protective device
- Motor temperature protection
- PTC motor protection relay
- Overcurrent relay
- Underfrequency relay
- Overfrequency relay
- Control supply monitor
- Voltage monitoring relay
- Current monitoring relay
- Insulation monitoring device
- Motor stall protection
- Locked-rotor protection
- Overtemperature protection
- Thermal cutout
- Configurable protection module

## Category 4 — Contactors and motor starters

Include:

- Single-pole contactor
- Two-pole contactor
- Three-pole contactor
- Four-pole contactor
- Auxiliary contactor
- AC coil contactor
- DC coil contactor
- Reversing contactor
- Mechanically interlocked contactor pair
- Electrically interlocked contactor pair
- DOL starter assembly
- Reversing DOL starter
- Star contactor
- Delta contactor
- Main star-delta contactor
- Star-delta starter assembly
- Two-speed starter
- Motor starter with overload
- Motor starter with circuit breaker
- Motor starter with fuse protection
- Capacitor switching contactor
- Lighting contactor
- Heating contactor
- Vacuum contactor abstraction
- Definite-purpose contactor
- Modular contactor
- Safety contactor
- Contactor with auxiliary NO
- Contactor with auxiliary NC
- Contactor with mixed auxiliary contacts
- Contactor with surge suppressor
- Contactor with mechanical latch
- Contactor with electronic coil
- Low-consumption contactor
- High-inrush contactor
- Motor reversing assembly
- Dual-contactor changeover assembly
- Contactor with feedback contact
- Contactor with delayed auxiliary contact
- Contactor with manual test operation
- Contactor with coil status indication
- Contactor with configurable pole arrangement
- Three-phase pump starter
- Three-phase fan starter
- Configurable industrial motor starter

Every assembly must have a valid internal topology and functional behavior.

## Category 5 — Relays and auxiliary contacts

Include:

- General-purpose relay
- Electromechanical relay
- Interface relay
- Intermediate relay
- Plug-in relay
- Latching relay
- Bistable relay
- Impulse relay
- Time-delay relay
- On-delay relay
- Off-delay relay
- Interval relay
- Cyclic relay
- Flasher relay
- Pulse relay
- Monitoring relay
- Voltage relay
- Current relay
- Frequency relay
- Phase sequence relay
- Phase loss relay
- Thermal relay
- Motor protection relay
- Safety relay abstraction
- Solid-state relay
- Reed relay
- Changeover relay
- Normally open auxiliary contact
- Normally closed auxiliary contact
- Changeover auxiliary contact
- Delayed NO contact
- Delayed NC contact
- Relay with two changeover contacts
- Relay with four changeover contacts
- Relay with LED indication
- Relay with manual test
- Relay with mechanical flag
- Relay with diode suppression
- Relay with RC suppression
- Relay with configurable coil voltage
- Relay with multiple contact groups
- Relay with positive-guided contacts
- Relay with feedback monitoring
- Relay with configurable delay
- Relay with reset input

## Category 6 — Switches and pushbuttons

Include:

- NO pushbutton
- NC pushbutton
- Illuminated pushbutton
- Momentary pushbutton
- Maintained pushbutton
- START pushbutton
- STOP pushbutton
- Emergency stop
- Two-position selector
- Three-position selector
- Key-operated selector
- Rotary switch
- Toggle switch
- Rocker switch
- Limit switch
- Roller limit switch
- Plunger limit switch
- Foot switch
- Pressure switch
- Float switch
- Level switch
- Temperature switch
- Flow switch
- Proximity switch
- Door switch
- Safety interlock switch
- Manual changeover switch
- Auto/manual selector
- Forward/reverse selector
- Local/remote selector
- Jog pushbutton
- Reset pushbutton
- Test pushbutton
- Two-hand control input abstraction
- Configurable multiposition switch

## Category 7 — Motors and motor assemblies

Include:

- Single-phase induction motor
- Capacitor-start motor
- Capacitor-run motor
- Permanent split-capacitor motor
- Split-phase motor
- Shaded-pole motor
- Three-phase squirrel-cage motor
- Three-phase wound-rotor motor
- Three-phase synchronous motor
- Permanent-magnet synchronous motor
- Brushless DC motor
- Brushed DC motor
- Series DC motor
- Shunt DC motor
- Compound DC motor
- Stepper motor
- Servo motor
- Gearmotor
- Brake motor
- Two-speed motor
- Dahlander motor configuration
- Star-delta motor configuration
- Reversible three-phase motor
- Reversible single-phase motor
- Motor with encoder
- Motor with PTC sensor
- Motor with thermal switch
- Motor with electromagnetic brake
- Motor with external fan
- Pump motor assembly
- Fan motor assembly
- Compressor motor assembly
- Conveyor motor assembly
- Hoist motor abstraction
- Positioning motor assembly
- VFD-driven induction motor
- Soft-starter-driven motor
- High-inertia motor model
- Low-inertia motor model
- Configurable industrial motor model

## Category 8 — Transformers and power conversion

Include:

- Single-phase transformer
- Three-phase transformer
- Isolation transformer
- Control transformer
- Autotransformer
- Step-up transformer
- Step-down transformer
- Current transformer
- Voltage transformer
- Instrument transformer
- Three-phase star-star transformer
- Three-phase delta-delta transformer
- Three-phase delta-star transformer
- Three-phase star-delta transformer
- Transformer with multiple taps
- Adjustable autotransformer
- Rectifier
- Single-phase bridge rectifier
- Three-phase bridge rectifier
- AC/DC converter
- DC/DC converter
- DC/AC inverter
- Frequency converter abstraction
- Battery charger
- Industrial power supply module
- DC bus converter
- Regulated DC converter
- Transformer with thermal protection
- Transformer with fuse protection
- Configurable transformer model

## Category 9 — Sensors and limit switches

Include:

- Inductive proximity sensor
- Capacitive proximity sensor
- Photoelectric through-beam sensor
- Retroreflective sensor
- Diffuse optical sensor
- Ultrasonic sensor
- Magnetic proximity sensor
- Reed sensor
- Hall-effect sensor
- Mechanical limit switch
- Roller lever limit switch
- Plunger limit switch
- Position sensor
- Rotary encoder
- Incremental encoder
- Absolute encoder
- Temperature sensor
- RTD sensor
- Thermocouple
- Pressure sensor
- Pressure switch
- Flow sensor
- Flow switch
- Level sensor
- Float level sensor
- Ultrasonic level sensor
- Current sensor
- Voltage sensor
- Speed sensor
- Vibration sensor
- Humidity sensor
- Light sensor
- Motor thermal sensor
- Door position sensor
- Safety position sensor
- Configurable analog sensor

## Category 10 — PLC and industrial control

Include:

- PLC CPU abstraction
- Compact PLC
- Modular PLC
- Digital input module
- Digital output module
- Analog input module
- Analog output module
- Relay output module
- Transistor output module
- 24 V DC input module
- 24 V DC output module
- AC input module
- AC output module
- High-speed counter module
- Encoder input module
- Temperature input module
- RTD input module
- Thermocouple input module
- Remote I/O module
- PLC power supply
- PLC terminal interface
- PLC communication interface
- Industrial Ethernet interface abstraction
- Fieldbus interface abstraction
- HMI interface abstraction
- Safety PLC abstraction
- Safety input module
- Safety output module
- Analog signal isolator
- Signal converter
- Interposing relay module
- PLC input simulator
- PLC output simulator
- Digital signal generator
- Analog signal generator
- Configurable PLC rack

## Category 11 — Timers, counters and control modules

Include:

- On-delay timer
- Off-delay timer
- Pulse timer
- Interval timer
- Cyclic timer
- Star-delta timer
- Multifunction timer
- Retentive timer
- Non-retentive timer
- Delay-on-release timer
- Digital counter
- Up counter
- Down counter
- Up/down counter
- Preset counter
- Batch counter
- Hour meter
- Runtime counter
- Sequence controller
- Step controller
- Pulse generator
- Flasher controller
- Time switch
- Weekly timer abstraction
- Configurable timing module

## Category 12 — Terminal blocks, connectors and cables

Include:

- Single-level terminal block
- Double-level terminal block
- Triple-level terminal block
- PE terminal block
- Neutral terminal block
- Fuse terminal block
- Disconnect terminal block
- Test terminal block
- Feed-through terminal block
- Distribution terminal block
- Sensor terminal block
- Actuator terminal block
- Plug-in terminal block
- Multi-pole connector
- Two-pin connector
- Three-pin connector
- Four-pin connector
- Five-pin connector
- Industrial circular connector
- Control cable
- Power cable
- Shielded cable
- Multi-core cable
- Single-core conductor
- Protective-earth conductor
- Neutral conductor
- Three-phase cable
- Cable shield
- Cable gland abstraction
- Busbar
- Busbar terminal
- Wire splice
- Junction terminal
- Cable bridge
- Configurable terminal strip

## Category 13 — Measuring and indicating devices

Include:

- Voltmeter
- Ammeter
- Multimeter
- Wattmeter
- Power factor meter
- Frequency meter
- Energy meter
- Current transformer meter
- Voltage transformer meter
- Phase sequence indicator
- Phase presence indicator
- Red indicator lamp
- Green indicator lamp
- Yellow indicator lamp
- Blue indicator lamp
- White indicator lamp
- Buzzer
- Audible alarm
- Alarm beacon
- Signal tower
- Motor speed indicator
- Temperature indicator
- Pressure indicator
- Digital panel meter
- Configurable measurement module

## Category 14 — Industrial loads and actuators

Include:

- Resistive load
- Inductive load
- Capacitive load
- Heating element
- Industrial heater
- Fan load
- Pump load
- Compressor load
- Conveyor load
- Solenoid coil
- Solenoid valve
- Pneumatic valve abstraction
- Hydraulic valve abstraction
- Linear actuator
- Rotary actuator
- Electromagnetic brake
- Clutch coil
- Magnetic lock
- Door actuator
- Damper actuator
- Lighting load
- Industrial lamp
- Alarm horn
- Cooling fan
- Ventilation actuator
- Water valve
- Process valve
- Controllable heater
- Three-phase load bank
- Single-phase load bank
- DC load
- Motorized valve
- Motorized damper
- Positioning actuator
- Configurable industrial load

## Category 15 — Power electronics and drives

Include:

- Diode
- Rectifier diode
- Zener diode
- SCR
- TRIAC
- Power MOSFET
- IGBT
- Diode bridge
- Controlled rectifier
- Three-phase rectifier
- DC chopper
- Buck converter
- Boost converter
- Buck-boost converter
- DC motor controller
- AC motor drive abstraction
- Variable-frequency drive
- Soft starter
- Single-phase inverter
- Three-phase inverter
- PWM controller
- DC bus module
- Braking resistor
- Braking chopper
- Line reactor
- DC reactor
- EMC filter abstraction
- Power factor correction capacitor
- Capacitor bank
- Configurable industrial drive

**Total: 520 catalog entries.**

Where a listed item is an assembly rather than a primitive device, define its internal components, connections and operating model.

Where detailed simulation is unsupported, identify the limitation and do not count the entry as fully simulation-verified until an appropriate functional model exists.

---

# A6. Component appearance requirements

Every catalog entry must have a component detail card.

The card must display:

- Component name
- Category
- IEC-style schematic symbol
- Physical preview where available
- Reference designation
- Terminal configuration
- Electrical ratings
- Simulation capabilities
- Description
- Applicable engineering references
- Insert into Diagram action

## Example: Three-pole contactor

**Component:** Three-pole contactor  
**Reference:** KM1  
**Symbol:** Three mechanically associated normally open power contacts  
**Power terminals:** 1/L1, 3/L2, 5/L3, 2/T1, 4/T2, 6/T3  
**Coil terminals:** A1, A2  
**Auxiliary contacts:** Configurable NO and NC  
**Parameters:** Coil voltage, rated current, contact delay, contact configuration  
**Simulation:** Coil energization, contact state transitions and switching events

The symbol must resemble the technical contactor representation visible in the reference image.

## Example: Thermal overload relay

**Component:** Three-phase thermal overload relay  
**Reference:** F1  
**Symbol:** Three linked thermal overload elements  
**Power terminals:** Three input/output current paths  
**Auxiliary terminals:** 95–96 and 97–98  
**Parameters:** Current setting, trip class, thermal state, reset mode  
**Simulation:** Current-dependent thermal trip and auxiliary contact switching

## Example: Three-phase motor

**Component:** Three-phase induction motor  
**Reference:** M1  
**Symbol:** Circle containing `M` and `3~`  
**Terminals:** U1, V1, W1, PE  
**Parameters:** Rated voltage, current, power, frequency, speed, efficiency, power factor and load  
**Simulation:** Startup, running, stopping, load response and supported faults

## Example: Pushbutton

**Component:** Normally open START pushbutton  
**Reference:** S1  
**Symbol:** Standard normally open contact  
**Terminals:** 13–14  
**Behavior:** Closes while pressed and opens when released

## Example: STOP pushbutton

**Component:** Normally closed STOP pushbutton  
**Reference:** S0  
**Symbol:** Standard normally closed contact  
**Terminals:** 21–22  
**Behavior:** Opens while pressed and returns closed when released

Terminal numbering must follow the actual component definition.

---

# A7. Mandatory component data model

Every component must include a structured definition equivalent to:

```ts
interface ElectricalComponentDefinition {
  id: string;
  name: string;
  category: string;
  referencePrefix: string;
  description: string;
  symbolId: string;
  terminals: ElectricalTerminalDefinition[];
  propertiesSchema: Record<string, unknown>;
  simulationModelId: string;
  simulationSupport:
    | "symbol-only"
    | "connectivity"
    | "control-logic"
    | "numerical"
    | "validated";
  documentation: string;
  standardsReferences: string[];
}
```

Use additional typed interfaces for:

- Electrical terminals
- Electrical nets
- Component instances
- Symbol geometry
- Simulation parameters
- Simulation events
- Motor states
- Protection states
- Measurement results
- Fault definitions

Catalog definitions must be separate from placed component instances.

Multiple placed instances may reference the same catalog definition while retaining independent properties and simulation states.

---

# A8. Symbol rendering engine

Create a dedicated industrial electrical symbol engine.

Each symbol must define:

- Vector paths
- Electrical terminal anchors
- Symbol bounds
- Text anchors
- Rotation rules
- Mirror rules
- Mechanical linkage indicators
- Reference-label positions
- Connection-point positions

Support:

- Normally open contacts
- Normally closed contacts
- Changeover contacts
- Coils
- Contactors
- Relays
- Circuit breakers
- Fuses
- Overload devices
- Transformers
- Motors
- Switches
- Sensors
- Terminal blocks
- PLC modules
- Measuring instruments
- Industrial loads

Use consistent graphical dimensions and stroke weights.

Do not draw all components as generic rectangles.

Do not substitute physical component images for technical symbols.

---

# A9. Wiring behavior

The user must be able to reproduce the wiring style in the reference image.

Required:

- Vertical phase conductors.
- Horizontal conductor branches.
- Orthogonal routing.
- Terminal-to-terminal connections.
- Junction dots.
- Crossing conductors without junctions.
- Wire continuation.
- Multiple connection points.
- PE conductors.
- Cable grouping.
- Terminal labels.
- Component reference labels.

Electrical junctions must represent actual network connectivity.

A crossing without a junction must remain electrically disconnected unless an explicit connection exists.

Moving a component must not break its connections.

Deleting a wire must update the electrical network.

Changing a switch state must update the connected circuit.

---

# A10. Component interaction and simulation

Every functional component must respond according to its model.

### Circuit breaker

- Open/close interaction.
- Supported trip behavior.
- State indication.
- Reset operation.

### Contactor

- Coil energization.
- Main contact switching.
- Auxiliary contact switching.
- Configured delays.

### Relay

- Coil activation.
- Associated contact changes.
- Timer behavior where applicable.

### Motor

- Supply detection.
- Startup.
- Running state.
- Stopping.
- Supported fault conditions.

### Pushbutton

- Press.
- Release.
- Momentary state transition.

### Selector switch

- Select operating position.
- Maintain selected position.
- Update associated contacts.

### Overload relay

- Monitor modeled current.
- Accumulate thermal state.
- Trip.
- Change auxiliary contact states.
- Reset.

### Sensor

- Accept simulated physical input.
- Generate corresponding electrical output.
- Respect its output type and supply requirements.

Do not implement universal fake ON/OFF behavior for devices with fundamentally different electrical functions.

---

# A11. Mandatory component-library interface

The left panel must contain:

**Component Library (520+)**

Categories:

- Power Supply
- Circuit Breakers
- Protection Devices
- Contactors & Starters
- Relays
- Switches & Pushbuttons
- Motors
- Transformers
- Sensors
- PLC & I/O
- Timers & Counters
- Terminal Blocks
- Measuring & Indication
- Drives & Power Electronics
- Industrial Loads & Actuators

Each category must expand into its component entries.

Selecting a component must display its detail preview.

The preview must show:

1. Component name.
2. Physical appearance where available.
3. Schematic symbol.
4. Terminal numbering.
5. Electrical ratings.
6. Description.
7. Simulation capabilities.
8. Insert into Diagram button.

The Insert action must place the actual electrical symbol on the schematic canvas.

Support search, filtering, favorites and recently used components.

---

# A12. Mandatory simulation visual states

When simulation runs, the schematic must visually communicate:

- Energized conductors
- De-energized conductors
- Open contacts
- Closed contacts
- Energized coils
- De-energized coils
- Running motors
- Stopped motors
- Tripped protection devices
- Electrical faults
- Invalid connections

Colors are visual indicators only.

The simulation state must come from actual electrical calculations and component logic.

Provide tooltips and labels so the user can identify states without relying on color.

Never use animated wire highlighting as a substitute for a functioning simulation engine.

---

# A13. Reference-image demonstration project

Create a project named:

**Reference Power Circuit — Single-Phase and Three-Phase Motors**

It must visually resemble the uploaded image.

Include:

- L1, L2, L3 and PE supply labels.
- Three-pole switching devices.
- Contactor symbols.
- Single-phase motor symbol.
- Three-phase motor symbol.
- Numbered electrical terminals.
- Orthogonal wiring.
- Junction points.
- Component references.
- Power-circuit title.

Because the source image is cropped and does not establish all wiring details, distinguish between:

**Reference-style schematic:** Reproduces the visible technical appearance.

**Validated operating example:** Uses independently checked electrical connections and correctly configured components.

For the operating example, provide separate control-circuit and power-circuit sheets.

The user must be able to run the validated example and observe the motor-control sequence.

---

# A14. Minimum verification for every component

A component is accepted only after:

1. Symbol renders correctly.
2. Terminal count is correct.
3. Terminal labels are valid.
4. Terminal positions are accessible.
5. Wires connect correctly.
6. Component properties can be edited.
7. Invalid properties are rejected.
8. Save/load preserves the component.
9. Rotation and movement preserve connections.
10. Simulation behavior matches the documented model.
11. Relevant fault conditions are handled.
12. Automated tests pass.

Maintain a catalog validation manifest.

Do not mark an untested component as tested.

---

# A15. Minimum verification for every example project

Each of the 500 projects must:

- Load successfully.
- Contain real component instances.
- Contain valid electrical connections.
- Use available simulation models.
- Pass topology validation.
- Execute its defined test sequence.
- Produce expected results.
- Support editing.
- Support saving.
- Support export.
- Include operating instructions.

A project that merely displays a diagram is not a completed runnable example.

---


# GLOBAL UI/UX STANDARD
## UNIVERSAL MENU, ICON, DROPDOWN AND FLOATING PANEL BEHAVIOR

**RULE ID:** GLOBAL-UI-UX-001  
**SCOPE:** ALL CURRENT AND FUTURE PROJECTS  
**PRIORITY:** Mandatory Global Development Standard  
**APPLIES TO:** All repositories, websites, web applications, dashboards, desktop applications, engineering software, CAD systems, and future products.

---

## 1. PRIMARY OBJECTIVE

Implement consistent, professional, lightweight, and predictable behavior for all interactive menus, icons, dropdowns, popovers, tooltips, and floating panels.

**GOLDEN RULE:**

Opening or closing a menu, icon panel, or dropdown must NEVER push, resize, reposition, or disturb the underlying application content.

All temporary menus and panels must float above the existing interface.

The underlying page, canvas, workspace, toolbar, sidebar, and other components must remain stationary.

---

## 2. UNIVERSAL MENU AND ICON BEHAVIOR

Apply the following interaction rules to all applicable interactive menus and icons.

### A. OPEN ON CLICK

- Click a menu or icon → its associated content opens.
- Click the same menu or icon again → its content closes.
- Click another menu or icon → the currently open panel closes and the newly selected panel opens.
- Only one transient menu or icon panel may remain open at a time within the same menu system.
- Opening a panel must not alter the surrounding layout.

### B. AUTOMATIC CLOSE ON MOUSE LEAVE

- When the mouse leaves the menu trigger and its associated panel, close the panel automatically.
- Moving the mouse from the trigger into its panel must NOT close it.
- Avoid flickering, accidental closing, or reopening loops.
- Use a short delay where necessary to allow natural mouse movement.
- Do not close a panel while the pointer is still interacting with its contents.

### C. CLICK OUTSIDE TO CLOSE

- Clicking outside an open menu or panel closes it.
- Pressing Escape closes the active panel.
- Opening another transient panel closes the previous one.
- Closing a panel must not reset unrelated application state.

### D. TOUCHSCREEN BEHAVIOR

- Tap a menu or icon to open its content.
- Tap the same trigger to close it.
- Tap another trigger to switch panels.
- Tap outside to close.
- Do not rely on hover or mouseleave for touch devices.
- Support keyboard and accessibility interactions where applicable.

---

## 3. DROPDOWN DISPLAY STANDARD

All dropdown menus must:

1. Open directly beneath or beside their associated trigger.
2. Float above the underlying application interface.
3. Display options in a clean, organized layout.
4. Support vertical lists and appropriate horizontal arrangements.
5. Remain fully interactive while open.
6. Close after selecting a completed command, unless the command requires continued interaction.
7. Support internal scrolling when content exceeds available space.
8. Remain within the visible viewport whenever possible.
9. Automatically reposition near screen boundaries.
10. Maintain appropriate stacking order above normal application content.

**IMPORTANT:**

Dropdowns must NEVER push the page, canvas, workspace, navigation bars, or other elements downward.

---

## 4. ICON AND TOOLBAR BEHAVIOR

Apply the same principles to interactive icons.

Examples include:

- Settings icons
- Search icons
- User profile icons
- Notification icons
- Tool selectors
- Drawing tools
- Engineering commands
- Formatting controls
- Filter icons
- Context menus
- Additional options menus

When an icon opens a temporary panel:

- The panel must appear near its associated icon.
- It must float above the interface.
- It must not change the position of surrounding elements.
- It must close using the defined interaction rules.
- Its existing functionality must remain intact.

Do not apply automatic closing to persistent panels, active editing dialogs, or workflows requiring ongoing user interaction unless explicitly designed for that behavior.

---

## 5. STRICT NO-LAYOUT-SHIFT RULE

**THIS RULE IS MANDATORY.**

Opening or closing any transient menu, dropdown, or icon panel must not cause:

- Page movement
- Canvas displacement
- Workspace resizing
- Toolbar shifting
- Sidebar movement
- Unexpected scrolling
- Content jumping
- Unnecessary component reflow
- Loss of user selection
- Changes to application data

**Expected behavior:**

Click → Panel opens above existing content → User interacts → Panel closes.

**Everything underneath remains stationary.**

---

## 6. TECHNICAL IMPLEMENTATION STANDARD

Use lightweight, maintainable solutions.

Recommended approaches:

- CSS absolute or fixed positioning
- React portals or equivalent framework mechanisms when necessary
- Correct stacking contexts and z-index
- Pointer and click event handling
- Mouseleave handling for desktop
- Click-outside detection
- Escape-key handling
- Appropriate focus management
- Viewport-aware positioning
- Internal overflow scrolling

Avoid unnecessary heavy UI libraries.

Prefer reusable components and shared interaction logic.

Prevent event propagation problems, accidental panel closure, focus loss, and conflicts between nested menus.

For accessibility, support appropriate ARIA attributes, visible focus indicators, keyboard navigation, and focus restoration.

---

## 7. GLOBAL CONSISTENCY REQUIREMENT

All applicable menus and icons across a product must follow the same interaction standard.

Do not implement different opening and closing behaviors without a documented UX reason.

Create or reuse a shared menu/popover component where appropriate.

The same global standard must apply across multiple projects while allowing each product to retain its own branding, visual design, and functionality.

---

## 8. VERIFICATION AND ACCEPTANCE TESTS

Before considering implementation complete, verify:

- Click opens the correct panel.
- Clicking the same trigger closes it.
- Clicking another trigger switches panels.
- Only one transient panel is open at a time.
- Mouse movement into the panel does not close it.
- Mouseleave closes the panel correctly.
- Clicking outside closes it.
- Escape closes it.
- Touch interactions work correctly.
- Keyboard navigation works correctly.
- Panels remain inside the viewport where possible.
- Long menus scroll internally.
- No underlying layout movement occurs.
- All existing commands remain functional.
- No application data is modified unexpectedly.
- No regression is introduced.

Test desktop, mobile, and tablet viewport sizes.

---

## 9. IMPLEMENTATION, MERGE AND DEPLOYMENT

For every project adopting this standard:

1. Inspect the existing menu and icon implementations.
2. Identify inconsistent behavior.
3. Implement the shared interaction standard.
4. Preserve existing application functionality.
5. Run relevant automated and browser tests.
6. Fix verified regressions.
7. Commit the verified changes.
8. Merge into the approved main branch.
9. Deploy using the project's existing deployment workflow.
10. Verify the deployed application.

Do not claim successful deployment without verification.

Do not proceed with unrelated development until the required menu correction and its verification are complete.

---

## 10. PERMANENT REPOSITORY REFERENCE

Store this document in the project's designated goals, governance, or standards repository.

**Recommended filename:**

`GLOBAL_UI_UX_MENU_ICON_STANDARD.md`

**Rule identifier:**

`GLOBAL-UI-UX-001`

Reference this standard from the project's `AGENTS.md` or equivalent development instructions.

For future projects:

- Load this standard during initial project setup.
- Apply it to all relevant interactive menus and icons.
- Include its acceptance tests in the normal development workflow.
- Reuse existing compliant components where practical.
- Do not unnecessarily rewrite working components.

This standard remains active until the project owner explicitly approves a revision.

---

## 11. FINAL CODEX DIRECTIVE

**CODEX:**

Treat GLOBAL-UI-UX-001 as a reusable, project-independent development standard.

Apply it consistently to all applicable current and future software projects.

Never allow transient menus, dropdowns, or icon panels to disturb the underlying interface.

Preserve existing functionality.

Implement, test, commit, merge, deploy, and verify changes according to each project's authorized workflow.

Save and reference this rule in the designated goals or standards repository for future development.

**GLOBAL STANDARD:**

**CLICK TO OPEN → FLOAT ABOVE CONTENT → INTERACT → AUTO-CLOSE ON MOUSE LEAVE OR OUTSIDE CLICK → ZERO LAYOUT SHIFT.**


## 1. LEFT-CLICK FUNCTIONS
1. Select Object
2. Select Text
3. Select Shape
4. Select Image
5. Select Layer
6. Select Tool
7. Activate Menu
8. Open Dropdown
9. Place Object
10. Insert Text
11. Draw Shape
12. Draw Line
13. Draw Curve
14. Add Point
15. Select Node
16. Move Cursor
17. Activate Input Field
18. Select Color
19. Apply Fill
20. Apply Outline
21. Select Page
22. Select Slide
23. Select Artboard
24. Select Component
25. Activate Control Point
26. Start Drawing
27. Start Dragging
28. Confirm Placement
29. Select Multiple Objects (Shift + Click)
30. Toggle Selection (Ctrl + Click)

## 2. RIGHT-CLICK FUNCTIONS
31. Open Context Menu
32. Copy
33. Cut
34. Paste
35. Delete
36. Duplicate
37. Rename
38. Group
39. Ungroup
40. Lock Object
41. Unlock Object
42. Hide Object
43. Show Object
44. Bring to Front
45. Send to Back
46. Bring Forward
47. Send Backward
48. Align Objects
49. Distribute Objects
50. Rotate Object
51. Flip Horizontal
52. Flip Vertical
53. Resize Object
54. Transform Object
55. Edit Object
56. Edit Text
57. Edit Nodes
58. Convert to Curves
59. Convert to Shape
60. Convert to Symbol
61. Object Properties
62. Format Object
63. Change Fill
64. Change Outline
65. Change Opacity
66. Change Layer
67. Move to Layer
68. Create New Layer
69. Merge Layers
70. Export Selection
71. Save as Component
72. Add Hyperlink
73. Remove Hyperlink
74. Add Comment
75. Inspect Object
76. Reset Transformation
77. Select Similar Objects
78. Select All
79. Invert Selection
80. Deselect All

## 3. DOUBLE-CLICK FUNCTIONS
81. Edit Text
82. Enter Group
83. Edit Shape
84. Edit Nodes
85. Open Object Properties
86. Open Component
87. Rename Layer
88. Rename Page
89. Rename Slide
90. Edit Symbol
91. Enter Isolation Mode
92. Open Image Editor
93. Edit Table Cell
94. Edit Chart
95. Edit Formula

## 4. MOUSE DRAG FUNCTIONS
96. Move Object
97. Resize Object
98. Rotate Object
99. Draw Selection Box
100. Select Multiple Objects
101. Draw Rectangle
102. Draw Ellipse
103. Draw Freehand Path
104. Draw Bezier Curve
105. Adjust Control Handles
106. Move Anchor Points
107. Adjust Gradient
108. Adjust Transparency
109. Crop Image
110. Pan Canvas
111. Drag Guide
112. Drag Ruler
113. Rearrange Layers
114. Rearrange Slides
115. Rearrange Pages
116. Rearrange Objects
117. Drag and Drop Files
118. Drag and Drop Components
119. Duplicate by Dragging
120. Adjust Object Spacing

## 5. MOUSE WHEEL FUNCTIONS
121. Zoom In
122. Zoom Out
123. Scroll Up
124. Scroll Down
125. Horizontal Scroll
126. Pan Canvas
127. Adjust Brush Size
128. Adjust Tool Value
129. Navigate Pages
130. Navigate Slides

## 6. CANVAS RIGHT-CLICK FUNCTIONS
131. Paste
132. Paste Special
133. Select All
134. Deselect All
135. Add New Object
136. Insert Image
137. Insert Text
138. Insert Shape
139. Insert Table
140. Insert Chart
141. Add Guide
142. Remove Guides
143. Show Grid
144. Hide Grid
145. Snap to Grid
146. Snap to Objects
147. Snap to Guides
148. Change Canvas Color
149. Change Page Size
150. Change Orientation
151. Canvas Properties
152. Page Properties
153. Zoom to Fit
154. Zoom to Selection
155. Reset View
156. Show Rulers
157. Hide Rulers
158. Lock Guides
159. Unlock Guides
160. Export Canvas

## 7. TOOLBAR RIGHT-CLICK FUNCTIONS
161. Customize Toolbar
162. Show Toolbar
163. Hide Toolbar
164. Reset Toolbar
165. Add Tool
166. Remove Tool
167. Rearrange Tools
168. Pin Tool
169. Unpin Tool
170. Tool Settings
171. Tool Properties
172. Reset Tool
173. Assign Shortcut
174. Change Tool Icon
175. Expand Tool Group
176. Collapse Tool Group
177. Show Tool Labels
178. Hide Tool Labels
179. Dock Toolbar
180. Undock Toolbar

## 8. LAYER PANEL MOUSE FUNCTIONS
181. Select Layer
182. Create Layer
183. Delete Layer
184. Duplicate Layer
185. Rename Layer
186. Lock Layer
187. Unlock Layer
188. Hide Layer
189. Show Layer
190. Reorder Layer
191. Merge Layer
192. Flatten Layer
193. Group Layers
194. Ungroup Layers
195. Change Layer Opacity
196. Change Layer Color
197. Move Object Between Layers
198. Expand Layer
199. Collapse Layer
200. Export Layer

## 9. ADVANCED CAD / VECTOR FUNCTIONS
201. Trim
202. Extend
203. Offset
204. Fillet
205. Chamfer
206. Weld
207. Intersect
208. Subtract
209. Combine
210. Break Apart
211. Join Paths
212. Split Path
213. Close Path
214. Simplify Path
215. Smooth Nodes
216. Convert Node Type
217. Add Dimension
218. Edit Dimension
219. Measure Distance
220. Measure Angle
221. Measure Area
222. Set Origin
223. Set Pivot Point
224. Mirror Object
225. Create Array
226. Create Pattern
227. Apply Boolean Operation
228. Extrude Object
229. Apply Perspective
230. Create Clipping Mask

## 10. POWERPOINT / PRESENTATION FUNCTIONS
231. Add Slide
232. Duplicate Slide
233. Delete Slide
234. Hide Slide
235. Change Slide Layout
236. Change Slide Background
237. Add Animation
238. Edit Animation
239. Add Transition
240. Edit Transition
241. Insert Media
242. Insert Chart
243. Insert SmartArt
244. Insert Text Box
245. Add Speaker Notes
246. Start Presentation
247. Preview Animation
248. Arrange Slide Objects
249. Group Slide Objects
250. Export Slide

## 11. ADDITIONAL PROFESSIONAL MOUSE FUNCTIONS
251. Undo
252. Redo
253. Repeat Last Action
254. Open Quick Actions
255. Open Command Search
256. Open Object Inspector
257. Open Properties Panel
258. Open Color Picker
259. Open Font Picker
260. Open Stroke Settings
261. Open Fill Settings
262. Open Effects Panel
263. Open Animation Panel
264. Open History Panel
265. Open Asset Library
266. Open Symbol Library
267. Open Templates
268. Open Plugins
269. Open Help
270. Open Keyboard Shortcuts
271. Copy Style
272. Paste Style
273. Clear Formatting
274. Reset Object
275. Replace Image
276. Relink Asset
277. Embed Asset
278. Detach Component
279. Create Component
280. Preview Object

**TOTAL: 280 MOUSE-INTERACTION FUNCTIONS.**

# COMPONENT FUNCTIONS INSIDE AN ENGINEERING DESIGN CANVAS
**CAD | Electrical Design | Circuit Design | PCB | Mechanical Design | CorelDRAW | PowerPoint | Diagram Editors**

## 1. COMPONENT SELECTION
1. Select Component
2. Multi-Select Components
3. Select All Components
4. Deselect Components
5. Select Connected Components
6. Select Similar Components
7. Select Components by Type
8. Select Components by Layer
9. Select Components by Name
10. Invert Selection

## 2. COMPONENT MOVEMENT
11. Move Component
12. Drag Component
13. Reposition Component
14. Move Multiple Components
15. Move Connected Components
16. Move Component Horizontally
17. Move Component Vertically
18. Move Component Freely
19. Move Component by Coordinates
20. Move Component with Arrow Keys
21. Snap Component to Grid
22. Snap Component to Another Component
23. Align Component to Guide
24. Lock Component Position
25. Unlock Component Position

## 3. COMPONENT CONNECTION
26. Connect Two Components
27. Connect Multiple Components
28. Connect Component Pins
29. Connect Input to Output
30. Connect Output to Input
31. Connect Power Pins
32. Connect Ground Pins
33. Connect Signal Pins
34. Connect Data Ports
35. Connect Control Ports
36. Connect Mechanical Joints
37. Connect Hydraulic Ports
38. Connect Pneumatic Ports
39. Connect Optical Ports
40. Connect Network Ports
41. Auto-Connect Components
42. Disconnect Components
43. Reconnect Components
44. Replace Existing Connection
45. Validate Connection
46. Highlight Connected Components
47. Trace Component Connections
48. Show Connection Path
49. Hide Connection Path
50. Detect Unconnected Components

## 4. WIRING FUNCTIONS
51. Start Wire
52. Draw Wire
53. End Wire
54. Connect Wire to Pin
55. Connect Wire to Terminal
56. Connect Wire to Another Wire
57. Extend Wire
58. Shorten Wire
59. Move Wire
60. Drag Wire
61. Bend Wire
62. Split Wire
63. Join Wires
64. Merge Wires
65. Delete Wire
66. Duplicate Wire
67. Copy Wire
68. Paste Wire
69. Rotate Wire
70. Change Wire Direction
71. Change Wire Thickness
72. Change Wire Color
73. Change Wire Style
74. Change Wire Type
75. Change Wire Material
76. Change Wire Label
77. Add Wire Junction
78. Remove Wire Junction
79. Add Wire Node
80. Remove Wire Node
81. Auto-Route Wire
82. Manual-Route Wire
83. Orthogonal Wire Routing
84. Curved Wire Routing
85. Straight Wire Routing
86. Avoid Wire Crossing
87. Detect Wire Crossing
88. Detect Wire Short Circuit
89. Highlight Wire Path
90. Trace Wire Connection

## 5. COMPONENT ROTATION
91. Rotate Component
92. Rotate 90 Degrees
93. Rotate 180 Degrees
94. Rotate 270 Degrees
95. Rotate Clockwise
96. Rotate Counterclockwise
97. Free Rotation
98. Rotate Around Center
99. Rotate Around Custom Pivot
100. Reset Rotation

## 6. COMPONENT TRANSFORMATION
101. Resize Component
102. Scale Component
103. Stretch Component
104. Flip Horizontally
105. Flip Vertically
106. Mirror Component
107. Skew Component
108. Change Component Orientation
109. Change Component Dimensions
110. Reset Transformation

## 7. COMPONENT EDITING
111. Edit Component
112. Edit Component Properties
113. Edit Component Name
114. Edit Component Label
115. Edit Component Value
116. Edit Component Description
117. Edit Component Parameters
118. Edit Component Dimensions
119. Edit Component Material
120. Edit Component Color
121. Edit Component Shape
122. Edit Component Symbol
123. Edit Component Footprint
124. Edit Component Pins
125. Edit Component Terminals
126. Edit Component Ports
127. Edit Component Metadata
128. Edit Component Reference ID
129. Edit Component Orientation
130. Reset Component Properties

## 8. COMPONENT DUPLICATION
131. Copy Component
132. Cut Component
133. Paste Component
134. Duplicate Component
135. Clone Component
136. Duplicate Connected Components
137. Duplicate Component with Wiring
138. Duplicate Component without Wiring
139. Create Component Array
140. Create Repeated Component Pattern

## 9. COMPONENT GROUPING
141. Group Components
142. Ungroup Components
143. Create Component Assembly
144. Break Component Assembly
145. Add Component to Group
146. Remove Component from Group
147. Move Group
148. Rotate Group
149. Resize Group
150. Lock Group
151. Unlock Group
152. Duplicate Group
153. Connect Component Groups
154. Save Group as Module
155. Convert Group to Reusable Component

## 10. COMPONENT ALIGNMENT
156. Align Left
157. Align Right
158. Align Top
159. Align Bottom
160. Align Center
161. Align Horizontally
162. Align Vertically
163. Distribute Horizontally
164. Distribute Vertically
165. Equalize Spacing
166. Snap to Grid
167. Snap to Component
168. Snap to Connection Point
169. Auto-Align Components
170. Auto-Arrange Components

## 11. COMPONENT PIN AND TERMINAL FUNCTIONS
171. Select Pin
172. Move Pin
173. Add Pin
174. Delete Pin
175. Rename Pin
176. Change Pin Number
177. Change Pin Type
178. Change Pin Direction
179. Connect Pin
180. Disconnect Pin
181. Highlight Pin
182. Show Pin Name
183. Hide Pin Name
184. Show Pin Number
185. Hide Pin Number
186. Swap Pins
187. Lock Pin
188. Unlock Pin
189. Validate Pin Connection
190. Detect Floating Pins

## 12. COMPONENT LAYER FUNCTIONS
191. Move Component to Layer
192. Create Component Layer
193. Delete Component Layer
194. Hide Component Layer
195. Show Component Layer
196. Lock Component Layer
197. Unlock Component Layer
198. Change Component Layer
199. Bring Component Forward
200. Send Component Backward
201. Bring Component to Front
202. Send Component to Back
203. Merge Component Layers
204. Duplicate Component Layer
205. Isolate Component Layer

## 13. COMPONENT CONSTRAINTS
206. Lock Component
207. Unlock Component
208. Fix Component Position
209. Apply Distance Constraint
210. Apply Angle Constraint
211. Apply Alignment Constraint
212. Apply Parallel Constraint
213. Apply Perpendicular Constraint
214. Apply Coincident Constraint
215. Apply Tangent Constraint
216. Apply Symmetry Constraint
217. Apply Rotation Constraint
218. Apply Movement Constraint
219. Remove Constraint
220. Validate Constraints

## 14. COMPONENT SIMULATION
221. Simulate Component
222. Simulate Connected Components
223. Start Simulation
224. Stop Simulation
225. Pause Simulation
226. Resume Simulation
227. Reset Simulation
228. Monitor Component State
229. Monitor Component Voltage
230. Monitor Component Current
231. Monitor Component Power
232. Monitor Component Temperature
233. Monitor Component Frequency
234. Monitor Component Signal
235. Display Simulation Results
236. Highlight Active Connections
237. Detect Simulation Errors
238. Inspect Component Behavior
239. Animate Component Operation
240. Export Simulation Results

## 15. COMPONENT TESTING AND VALIDATION
241. Test Component
242. Test Connection
243. Test Wiring
244. Test Circuit
245. Check Connectivity
246. Check Pin Compatibility
247. Check Electrical Rules
248. Check Design Rules
249. Detect Short Circuits
250. Detect Open Circuits
251. Detect Overlapping Components
252. Detect Invalid Connections
253. Detect Missing Connections
254. Detect Duplicate Connections
255. Detect Component Conflicts
256. Highlight Errors
257. Show Error Details
258. Auto-Fix Supported Errors
259. Generate Validation Report
260. Clear Validation Results

## 16. COMPONENT ORGANIZATION
261. Rename Component
262. Number Component
263. Tag Component
264. Categorize Component
265. Search Component
266. Filter Components
267. Sort Components
268. Hide Component
269. Show Component
270. Isolate Component
271. Highlight Component
272. Add Component Notes
273. Add Component Comments
274. Add Component Documentation
275. Assign Component Identifier
276. Create Component Hierarchy
277. Add Component to Library
278. Remove Component from Library
279. Save Component Template
280. Load Component Template

## 17. COMPONENT REPLACEMENT
281. Replace Component
282. Swap Component
283. Change Component Type
284. Change Component Model
285. Change Component Symbol
286. Change Component Footprint
287. Replace Component While Preserving Connections
288. Replace Component While Preserving Position
289. Replace Component While Preserving Properties
290. Restore Previous Component

## 18. ADVANCED WIRING AND ROUTING
291. Create Wire Bus
292. Connect Component to Bus
293. Add Bus Entry
294. Remove Bus Entry
295. Split Bus
296. Merge Buses
297. Rename Net
298. Assign Net Label
299. Assign Net Class
300. Assign Wire Gauge
301. Assign Wire Length
302. Calculate Wire Length
303. Calculate Wire Resistance
304. Calculate Voltage Drop
305. Auto-Optimize Wiring
306. Route Around Obstacles
307. Route Through Waypoints
308. Add Wire Waypoint
309. Remove Wire Waypoint
310. Move Wire Waypoint
311. Create Differential Pair
312. Route Differential Pair
313. Create Wire Harness
314. Bundle Wires
315. Unbundle Wires
316. Create Terminal Block
317. Connect to Terminal Block
318. Generate Wiring Diagram
319. Generate Netlist
320. Export Wiring Data

## 19. COMPONENT INTERACTION WITH THE CANVAS
321. Drag Component from Sidebar to Canvas
322. Drop Component onto Canvas
323. Preview Component Before Placement
324. Place Component at Cursor
325. Place Multiple Components
326. Cancel Component Placement
327. Undo Component Placement
328. Redo Component Placement
329. Show Component Bounding Box
330. Show Component Selection Handles
331. Show Component Connection Points
332. Show Component Alignment Guides
333. Show Component Dimensions
334. Show Component Coordinates
335. Show Component Tooltip
336. Open Component Context Menu
337. Open Component Properties Panel
338. Open Component Quick Actions
339. Zoom to Component
340. Center Component in View

## 20. PROFESSIONAL CANVAS INTERACTION FUNCTIONS
341. Drag Component Without Disconnecting Wires
342. Drag Component and Automatically Reroute Wires
343. Move Connected Components Together
344. Move Component While Preserving Connection Geometry
345. Rotate Component While Maintaining Connections
346. Duplicate Component with Existing Connections
347. Auto-Snap Wire to Nearest Valid Pin
348. Preview Connection Before Completion
349. Highlight Valid Connection Targets
350. Highlight Invalid Connection Targets
351. Prevent Invalid Pin Connections
352. Automatically Create Wire Junctions
353. Automatically Remove Redundant Junctions
354. Automatically Update Connections After Movement
355. Automatically Recalculate Wire Paths
356. Automatically Update Component Coordinates
357. Automatically Update Component Dimensions
358. Automatically Update Component Labels
359. Automatically Update Netlist
360. Automatically Save Canvas Changes



# ELECTRICAL ENGINEERING DESIGN LIBRARY — REAL COMPONENTS FOR 50 INDUSTRIAL PROJECTS

**Requirement:** Every component must represent a real, commercially available engineering device with an identifiable manufacturer, model number, technical specifications, terminals, and electrical connections.

**No dummy components. No placeholder symbols. No fictional manufacturer part numbers.**

The following is a proposed component library for designing the 50 projects. It is **not a claim that these components are already installed in an accessible CAD library**.

## 1. INDUSTRIAL POWER AND DISTRIBUTION COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 1 | Miniature circuit breaker (MCB) | Siemens SENTRON 5SY |
| 2 | Molded-case circuit breaker (MCCB) | Schneider Electric ComPacT NSX |
| 3 | Air circuit breaker (ACB) | ABB SACE Emax 2 |
| 4 | Residual-current circuit breaker (RCCB) | ABB F200 |
| 5 | RCBO | ABB DS201 |
| 6 | Motor protection circuit breaker | Siemens SIRIUS 3RV2 |
| 7 | Fuse switch disconnector | Siemens SENTRON 3NP1 |
| 8 | Industrial fuse | Eaton Bussmann series |
| 9 | Fuse holder | Phoenix Contact |
| 10 | Switch disconnector | ABB OT series |
| 11 | Main isolator | Schneider Electric TeSys Vario |
| 12 | Automatic transfer switch | Socomec ATyS |
| 13 | Surge protection device | DEHNguard |
| 14 | Power distribution block | Phoenix Contact PTFIX |
| 15 | Busbar system | Rittal RiLine |
| 16 | Current transformer | Schneider Electric PowerLogic |
| 17 | Voltage transformer | ABB instrument transformers |
| 18 | Multifunction power meter | Siemens SENTRON PAC |
| 19 | Energy meter | Schneider Electric PowerLogic PM5000 |
| 20 | Power quality analyzer | Janitza UMG 96 |

## 2. MOTOR CONTROL COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 21 | Three-phase contactor | Siemens SIRIUS 3RT2 |
| 22 | Reversing contactor assembly | Schneider Electric TeSys Deca |
| 23 | Thermal overload relay | Siemens SIRIUS 3RU2 |
| 24 | Electronic overload relay | Siemens SIRIUS 3RB3 |
| 25 | Motor starter | Eaton PKZM0 |
| 26 | Soft starter | ABB PSTX |
| 27 | Variable-frequency drive | Siemens SINAMICS G120 |
| 28 | Compact variable-frequency drive | ABB ACS580 |
| 29 | Servo drive | Siemens SINAMICS S210 |
| 30 | Servo motor | Siemens SIMOTICS S-1FK2 |
| 31 | Three-phase induction motor | Siemens SIMOTICS GP |
| 32 | Geared motor | SEW-EURODRIVE DRN series |
| 33 | Motor brake | SEW-EURODRIVE brake systems |
| 34 | Motor braking resistor | Siemens SINAMICS accessories |
| 35 | Motor line reactor | Schneider Electric Altivar accessories |
| 36 | EMC filter | Schaffner FN series |
| 37 | Motor encoder | SICK DFS60 |
| 38 | Motor thermistor relay | Siemens SIRIUS 3RN2 |
| 39 | Motor monitoring relay | Schneider Electric Harmony Control |
| 40 | Motor control center | Siemens SIVACON S8 |

## 3. PLC AND INDUSTRIAL AUTOMATION COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 41 | Compact PLC | Siemens SIMATIC S7-1200 |
| 42 | Modular PLC | Siemens SIMATIC S7-1500 |
| 43 | Safety PLC | Siemens SIMATIC S7-1500F |
| 44 | PLC CPU | Siemens CPU 1511-1 PN |
| 45 | Digital input module | Siemens SM 521 |
| 46 | Digital output module | Siemens SM 522 |
| 47 | Analog input module | Siemens SM 531 |
| 48 | Analog output module | Siemens SM 532 |
| 49 | Remote I/O interface | Siemens ET 200SP |
| 50 | Remote I/O station | WAGO 750 series |
| 51 | PLC power supply | Siemens SITOP |
| 52 | Industrial communication processor | Siemens SIMATIC CP |
| 53 | PLC memory card | Siemens SIMATIC Memory Card |
| 54 | Industrial Ethernet switch | Siemens SCALANCE XC |
| 55 | Industrial router | Siemens SCALANCE M |
| 56 | HMI touch panel | Siemens SIMATIC HMI Unified |
| 57 | Industrial panel PC | Siemens SIMATIC IPC |
| 58 | Industrial edge computer | Siemens Industrial Edge |
| 59 | PLC interface relay | Phoenix Contact PLC-INTERFACE |
| 60 | Signal conditioner | Phoenix Contact MINI Analog Pro |

## 4. INDUSTRIAL SENSORS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 61 | Inductive proximity sensor | SICK IME |
| 62 | Capacitive proximity sensor | ifm KI |
| 63 | Photoelectric sensor | SICK W4 |
| 64 | Ultrasonic sensor | Pepperl+Fuchs UC |
| 65 | Laser distance sensor | SICK DT |
| 66 | Magnetic cylinder sensor | Festo SMT-8M |
| 67 | Mechanical limit switch | Schneider Electric XCK |
| 68 | Rotary encoder | SICK DFS60 |
| 69 | Linear position sensor | Balluff BTL |
| 70 | Pressure transmitter | Endress+Hauser Cerabar |
| 71 | Differential pressure transmitter | Siemens SITRANS P |
| 72 | Temperature transmitter | Endress+Hauser iTEMP |
| 73 | RTD temperature sensor | WIKA TR series |
| 74 | Thermocouple | WIKA TC series |
| 75 | Flowmeter | Endress+Hauser Promag |
| 76 | Level transmitter | Endress+Hauser Micropilot |
| 77 | Level switch | Endress+Hauser Liquiphant |
| 78 | Conductivity sensor | Endress+Hauser Memosens |
| 79 | pH sensor | Endress+Hauser Memosens CPS |
| 80 | Vibration sensor | ifm VSA |

## 5. INDUSTRIAL CONTROL AND SWITCHING

| # | Component | Real manufacturer / product family |
|---|---|---|
| 81 | Start pushbutton | Schneider Electric Harmony XB5 |
| 82 | Stop pushbutton | Schneider Electric Harmony XB5 |
| 83 | Emergency-stop device | Schneider Electric Harmony XB5 |
| 84 | Selector switch | Schneider Electric Harmony XB5 |
| 85 | Key-operated switch | Schneider Electric Harmony XB5 |
| 86 | Pilot light | Schneider Electric Harmony XB5 |
| 87 | Illuminated pushbutton | Schneider Electric Harmony XB5 |
| 88 | Control relay | Finder 55 series |
| 89 | Timer relay | Siemens SIRIUS 3RP |
| 90 | Monitoring relay | Siemens SIRIUS 3UG |
| 91 | Safety relay | Pilz PNOZ X |
| 92 | Safety controller | Pilz PNOZmulti 2 |
| 93 | Solid-state relay | Carlo Gavazzi RGC |
| 94 | Interface relay | Phoenix Contact PLC-RSC |
| 95 | Latching relay | Finder 26 series |
| 96 | Temperature controller | Omron E5CC |
| 97 | PID process controller | Eurotherm 3200 |
| 98 | Signal isolator | Phoenix Contact MINI Analog Pro |
| 99 | Alarm annunciator | Eaton M22 |
| 100 | Industrial buzzer | Werma |

## 6. TERMINALS, WIRING AND CONNECTION COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 101 | Feed-through terminal | Phoenix Contact UK 5 N |
| 102 | Ground terminal | Phoenix Contact USLKG |
| 103 | Fuse terminal | Phoenix Contact UK 5-HESI |
| 104 | Disconnect terminal | Phoenix Contact UT series |
| 105 | Sensor terminal | Phoenix Contact PT series |
| 106 | Multi-level terminal | Phoenix Contact ST series |
| 107 | Terminal jumper | Phoenix Contact FBS |
| 108 | Terminal end plate | Phoenix Contact |
| 109 | Terminal end clamp | Phoenix Contact |
| 110 | DIN rail | Phoenix Contact NS 35 |
| 111 | Wire duct | Panduit |
| 112 | Cable gland | LAPP SKINTOP |
| 113 | Cable marker | Phoenix Contact |
| 114 | Wire marker | Weidmüller |
| 115 | Ferrule | Weidmüller |
| 116 | Ring cable lug | Klauke |
| 117 | Industrial connector | Harting Han |
| 118 | M12 sensor connector | Phoenix Contact |
| 119 | Multipole connector | Harting Han |
| 120 | Industrial Ethernet connector | Siemens IE FC RJ45 |

## 7. INDUSTRIAL POWER SUPPLIES

| # | Component | Real manufacturer / product family |
|---|---|---|
| 121 | 24 V DC power supply | Siemens SITOP PSU6200 |
| 122 | Redundant power supply module | Siemens SITOP RED |
| 123 | DC UPS | Siemens SITOP UPS1600 |
| 124 | Industrial battery module | Siemens SITOP BAT1600 |
| 125 | DC/DC converter | Phoenix Contact QUINT |
| 126 | AC/DC converter | Mean Well SDR |
| 127 | Control transformer | Schneider Electric Phaseo |
| 128 | Isolation transformer | BLOCK |
| 129 | Electronic circuit protector | Phoenix Contact CAPAROC |
| 130 | Power monitoring module | Siemens SITOP |

## 8. PNEUMATIC AND HYDRAULIC COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 131 | Pneumatic solenoid valve | Festo VUVG |
| 132 | Pneumatic valve terminal | Festo VTUG |
| 133 | Pneumatic cylinder | Festo DSBC |
| 134 | Compact pneumatic cylinder | Festo ADN |
| 135 | Pneumatic gripper | Festo DHPS |
| 136 | Air preparation unit | Festo MS series |
| 137 | Pressure regulator | Festo LR |
| 138 | Pressure sensor | Festo SPAN |
| 139 | Flow control valve | Festo GRLA |
| 140 | Vacuum generator | Festo OVEM |
| 141 | Hydraulic directional valve | Bosch Rexroth 4WE |
| 142 | Hydraulic proportional valve | Bosch Rexroth |
| 143 | Hydraulic pressure sensor | Bosch Rexroth |
| 144 | Hydraulic power unit | Bosch Rexroth CytroPac |
| 145 | Hydraulic cylinder | Bosch Rexroth |

## 9. BUILDING, ENERGY AND POWER SYSTEM COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 146 | Solar inverter | SMA Sunny Tripower |
| 147 | Hybrid inverter | Fronius GEN24 |
| 148 | PV DC isolator | ABB OTDC |
| 149 | PV surge protector | DEHNguard |
| 150 | PV connector | Stäubli MC4 |
| 151 | Battery inverter | SMA Sunny Island |
| 152 | Battery energy storage system | Tesla Megapack |
| 153 | EV charging station | ABB Terra |
| 154 | EV charging controller | Phoenix Contact CHARX |
| 155 | Generator controller | ComAp InteliLite |
| 156 | Automatic transfer switch | Socomec ATyS |
| 157 | UPS system | Schneider Electric Galaxy |
| 158 | Power monitoring meter | Schneider Electric PowerLogic |
| 159 | Building automation controller | Siemens Desigo PXC |
| 160 | HVAC actuator | Belimo |
| 161 | HVAC differential pressure sensor | Siemens |
| 162 | Fire alarm interface module | Siemens Cerberus PRO |
| 163 | Emergency lighting controller | Eaton |
| 164 | Refrigeration controller | Danfoss AK-CC |
| 165 | Energy management gateway | Siemens |

## 10. ROBOTICS AND MACHINE SAFETY COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 166 | Industrial robot | ABB IRB 1200 |
| 167 | Industrial robot controller | ABB OmniCore |
| 168 | Collaborative robot | Universal Robots UR10e |
| 169 | Robot gripper | SCHUNK |
| 170 | Robot tool changer | ATI Industrial Automation |
| 171 | Safety light curtain | SICK deTec4 |
| 172 | Safety laser scanner | SICK microScan3 |
| 173 | Safety door switch | Schmersal AZM |
| 174 | Safety relay | Pilz PNOZ |
| 175 | Safety PLC | Siemens S7-1500F |
| 176 | Two-hand control station | Schneider Electric |
| 177 | Emergency-stop pushbutton | Eaton M22 |
| 178 | Safety enabling switch | EUCHNER |
| 179 | Safety encoder | SICK |
| 180 | Safety-rated drive | Siemens SINAMICS |

## 11. ADDITIONAL SPECIALIZED COMPONENTS

| # | Component | Real manufacturer / product family |
|---|---|---|
| 181 | Industrial weighing transmitter | Siemens SIWAREX |
| 182 | Load cell | HBM Z6 |
| 183 | Barcode scanner | SICK CLV |
| 184 | RFID reader | Siemens SIMATIC RF |
| 185 | Machine vision camera | Cognex In-Sight |
| 186 | Industrial lighting | Banner Engineering |
| 187 | Industrial network gateway | HMS Anybus |
| 188 | Modbus gateway | Moxa MGate |
| 189 | Industrial wireless access point | Siemens SCALANCE W |
| 190 | Remote telemetry unit | Schneider Electric SCADAPack |
| 191 | Data logger | Campbell Scientific CR1000X |
| 192 | Industrial alarm dialer | Ewon |
| 193 | Industrial vibration monitor | ifm VSE |
| 194 | Condition monitoring system | SKF IMx |
| 195 | Industrial panel enclosure | Rittal AX |
| 196 | Floor-standing enclosure | Rittal VX25 |
| 197 | Enclosure cooling unit | Rittal Blue e+ |
| 198 | Enclosure thermostat | STEGO |
| 199 | Enclosure heater | STEGO |
| 200 | Cabinet fan/filter unit | Rittal |

---

# 12. REAL PROJECT EXAMPLES — ALL 50 PROJECTS

Each project below uses real equipment families. The listed equipment is a starting bill of materials, **not a completed or verified electrical design**.

| Project | Real components to use |
|---|---|
| 01. Reversing motor starter | Siemens 3RT2, 3RV2, 3RU2, SIMOTICS GP, Harmony XB5 |
| 02. Star–delta starter | Siemens 3RT2 contactors, 3RP timer, 3RU2 overload, SIMOTICS GP |
| 03. VFD conveyor | Siemens S7-1200, SINAMICS G120, SICK W4, SEW DRN |
| 04. Servo motion cell | Siemens S7-1500, SINAMICS S210, SIMOTICS S-1FK2, SICK encoders |
| 05. Duty/standby pump | ABB PSTX, Siemens S7-1200, Endress+Hauser Cerabar |
| 06. Segmented MCC | Siemens SIVACON S8, 3RV2, 3RT2, SENTRON PAC |
| 07. Industrial fan bank | ABB ACS580, Siemens S7-1500, SITRANS P |
| 08. Packaging machine | Siemens S7-1500, ET 200SP, Festo VUVG, SICK W4 |
| 09. Hoist/crane control | SEW drives and brakes, Siemens PLC, SICK encoders |
| 10. Hydraulic power unit | Bosch Rexroth CytroPac, 4WE valves, Siemens PLC |
| 11. Modular PLC cabinet | Siemens S7-1500, ET 200SP, SITOP, SCALANCE |
| 12. Water-treatment plant | Siemens S7-1500, Endress+Hauser Memosens, Promag |
| 13. Wastewater lift station | Schneider SCADAPack, ABB PSTX, Endress+Hauser Micropilot |
| 14. Food processing line | Siemens S7-1500, SEW drives, SICK sensors |
| 15. Chemical batch reactor | Siemens S7-1500, Endress+Hauser temperature/pressure instruments |
| 16. Brewery/CIP skid | Siemens PLC, Endress+Hauser Promag, Memosens sensors |
| 17. Industrial oven | Eurotherm 3200, WIKA thermocouples, Carlo Gavazzi SSR |
| 18. HVAC AHU | Siemens Desigo PXC, Belimo actuators, Siemens sensors |
| 19. Cold storage | Danfoss AK-CC, pressure sensors, refrigeration actuators |
| 20. Warehouse sorter | Siemens S7-1500, SINAMICS G120, SICK scanners |
| 21. LV distribution board | ABB SACE Emax 2, ComPacT NSX, PowerLogic |
| 22. Industrial subdistribution | Siemens SENTRON, Janitza UMG, Phoenix terminals |
| 23. Emergency lighting | Eaton emergency lighting equipment, Socomec ATS |
| 24. Building automation | Siemens Desigo PXC, Belimo, Siemens field sensors |
| 25. Solar PV | SMA Sunny Tripower, Stäubli MC4, ABB OTDC, DEHN |
| 26. Battery storage | Tesla Megapack, Siemens monitoring equipment |
| 27. EV charging | ABB Terra, Phoenix Contact CHARX, PowerLogic |
| 28. Generator ATS | ComAp InteliLite, Socomec ATyS, SENTRON PAC |
| 29. UPS bypass | Schneider Galaxy, Socomec switching, PowerLogic |
| 30. Data-center alarms | Siemens PLC, Phoenix Contact relays, Rittal enclosures |
| 31. Robotic welding | ABB IRB 1200, OmniCore, Siemens safety PLC |
| 32. CNC auxiliary controls | Siemens S7-1500, SINAMICS, SICK sensors |
| 33. Assembly-line safety | Pilz PNOZmulti 2, SICK deTec4, Schmersal AZM |
| 34. Pneumatic pick-and-place | Festo DSBC, VUVG, SMT-8M, Siemens PLC |
| 35. Injection molding | Siemens PLC, Bosch Rexroth hydraulics, WIKA sensors |
| 36. Printing press | Siemens SINAMICS S210, S7-1500, SICK encoders |
| 37. Textile machine | ABB ACS580, Siemens PLC, SICK sensors |
| 38. Pharmaceutical filling | Siemens PLC, Festo pneumatics, Cognex vision |
| 39. Automated palletizer | ABB robot, Siemens PLC, SICK scanners |
| 40. Industrial test bench | Siemens PLC, HBM load cells, Janitza meters |
| 41. IEC machine panel | Siemens SIRIUS, SIMATIC, Phoenix Contact, Rittal |
| 42. NFPA 79 machine panel | Rockwell Automation, Allen-Bradley, Panduit |
| 43. UL 508A panel example | Rockwell Automation, Eaton, Panduit, Rittal |
| 44. Marshalling cabinet | Phoenix Contact terminals, Weidmüller markers, Harting |
| 45. Marine auxiliary panel | ABB switching, Siemens monitoring, approved marine equipment |
| 46. Irrigation automation | Siemens S7-1200, Festo valves, Endress+Hauser sensors |
| 47. Railway auxiliary controls | Siemens PLC, Phoenix Contact terminals, industrial relays |
| 48. Mining ventilation | ABB ACS580, Siemens PLC, industrial sensors |
| 49. Hospital auxiliary alarms | Siemens monitoring, Phoenix Contact relays, Rittal cabinets |
| 50. Training laboratory | Siemens S7-1200, SIRIUS contactors, Festo valves, SICK sensors |

---

# 13. COMPONENT DATA REQUIRED INSIDE THE ENGINEERING CANVAS

Every real component entered into the library should contain these **30 fields**:

1. Manufacturer
2. Manufacturer part number
3. Product family
4. Component category
5. Component description
6. Electrical symbol
7. IEC symbol representation
8. ANSI/NFPA symbol representation, where applicable
9. Rated operating voltage
10. Rated operating current
11. Rated power
12. Operating frequency
13. Terminal numbers
14. Terminal names
15. Pin definitions
16. Connection types
17. Electrical characteristics
18. Mechanical dimensions
19. Mounting method
20. Protection rating
21. Operating temperature
22. Manufacturer datasheet
23. Manufacturer installation manual
24. Wiring diagram
25. Connection diagram
26. Compatible accessories
27. Compatible components
28. Component reference designation
29. Component revision/version
30. Verified source and verification date

**Important:** Not every field applies to every component. A mechanical enclosure, for example, does not have an operating current or electrical pinout.

---

# 14. REAL ENGINEERING PROJECT DOCUMENTATION — 100+ SHEETS PER PROJECT

Each of the 50 projects should have its own independent documentation package.

| Sheet range | Documentation |
|---|---|
| 001–005 | Cover, project information, revision history |
| 006–010 | Drawing index and standards |
| 011–020 | Electrical power distribution |
| 021–030 | Motor and drive circuits |
| 031–040 | PLC and control circuits |
| 041–050 | Sensors and instrumentation |
| 051–060 | Safety and interlocking circuits |
| 061–070 | Terminal and wiring diagrams |
| 071–080 | Cable schedules and connections |
| 081–090 | Equipment layouts and panel drawings |
| 091–100 | Bills of materials, testing and commissioning |
| 101–110 | Installation and maintenance documentation |
| 111–120 | Calculations, verification and project-specific documentation |

**120 sheets per project × 50 projects = 6,000 sheets.**

These are proposed documentation structures, not completed drawings. Sheet allocation must be adapted to each project's actual topology, and every sheet must contain meaningful project-specific information.

---



# A16. Final agent instruction

The component library and schematic drawing engine are core product requirements.

Do not postpone correct electrical symbols, terminal definitions or functional wiring until after the interface is complete.

Build the application around the electrical model.

Use the original power-circuit image as the primary drawing-style reference.

The final application must allow an electrician to reproduce this type of schematic using standard electrical symbols, connect its terminals, simulate the actual circuit behavior and inspect electrical measurements.

**The objective is not to create a beautiful picture of an electrical circuit. The objective is to create a professional electrical CAD system in which the drawing is the executable engineering model.**

Append this addendum to the original master specification and treat all requirements as mandatory release acceptance criteria.

