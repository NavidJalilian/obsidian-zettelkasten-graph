# Test Cases for Note Creation Feature - FIXED VERSION

## Sequential Note Creation Tests (CORRECTED LOGIC)

### Test Case 1: Basic Sequential Numbers (FIXED)
- Current: `4` → Expected: `5` ✅ (was incorrectly `4.1`)
- Current: `4.1` → Expected: `4.2` ✅ (was incorrectly `4.1.1`)
- Current: `4.2.3` → Expected: `4.2.4` ✅

### Test Case 2: Sequential with Gaps (FIXED)
- Existing: `4`, `6` → From `4` create: `5` ✅
- Existing: `4.1`, `4.3` → From `4.1` create: `4.2` ✅

### Test Case 3: Sequential from Branch Numbers (FIXED)
- Current: `4a` → Expected: `5` ✅ (removes letter suffix, increments base)
- Current: `4.1b` → Expected: `4.2` ✅ (removes letter suffix, increments at same level)

## Branch Note Creation Tests (VERIFIED CORRECT)

### Test Case 1: Basic Branch Creation ✅
- Current: `4` → Expected: `4a` ✅
- Current: `4.1` → Expected: `4.1a` ✅
- Current: `4.2.3` → Expected: `4.2.3a` ✅

### Test Case 2: Branch with Existing Letters ✅
- Existing: `4a` → From `4` create: `4b` ✅
- Existing: `4a`, `4c` → From `4` create: `4b` ✅
- Existing: `4.1a`, `4.1b` → From `4.1` create: `4.1c` ✅

### Test Case 3: Branch from Branch Numbers ✅
- Current: `4a` → Expected: `4b` ✅
- Current: `4.1b` → Expected: `4.1c` ✅

## Edge Cases

### Test Case 1: Large Numbers
- Current: `999` → Expected: `1000`
- Current: `21.99` → Expected: `21.100`

### Test Case 2: Multiple Letter Branches
- Existing: `21a` through `21z` → From `21` create: `21aa` (if implemented)

### Test Case 3: Complex Hierarchies
- Current: `21.1.2.3` → Sequential: `21.1.2.4`
- Current: `21.1.2.3` → Branch: `21.1.2.3a`

## File Creation Tests

### Test Case 1: Filename Generation
- Parent: `21 - Introduction.md` → Sequential: `22 - Introduction.md`
- Parent: `21 - Introduction.md` → Branch: `21a - Introduction.md`

### Test Case 2: Folder Placement
- With folder setting: Notes created in specified folder
- Without folder setting: Notes created in same folder as parent

### Test Case 3: Content Generation
- Check that new notes have proper headers
- Check that timestamps are included
- Check that basic template is applied

## UI Interaction Tests (COMPLETELY REDESIGNED)

### Test Case 1: Hover-based Buttons ✅ NEW FEATURE
- Hover over node shows two circular buttons
- Sequential button (→) appears on the left with blue styling
- Branch button (⤴) appears on the right with red styling
- Buttons disappear when mouse leaves node area
- Smooth fade-in animation for button appearance

### Test Case 2: Note Creation Flow ✅ IMPROVED
- Hover over node → Buttons appear → Click button → Note created
- Graph refreshes STABLY (preserves zoom/pan position) ✅ FIXED
- New note appears in graph without jumping ✅ FIXED
- New note opens for editing
- Success notice is shown

### Test Case 3: Graph Stability ✅ NEW FEATURE
- Graph maintains zoom level after note creation ✅ FIXED
- Graph maintains pan position after note creation ✅ FIXED
- Existing nodes stay in their positions ✅ FIXED
- No unexpected jumping or movement ✅ FIXED

### Test Case 4: Error Handling ✅
- Handle file creation errors gracefully
- Show appropriate error messages
- Don't break graph functionality on errors
- Buttons disappear properly on errors
