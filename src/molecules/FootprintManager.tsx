import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
import styled from 'styled-components';
import Split from 'react-split';
import { Editor } from '@monaco-editor/react';
import { useConfigContext } from '../context/ConfigContext';
import { theme } from '../theme/theme';
import Title from '../atoms/Title';
import Input from '../atoms/Input';

/**
 * Interface for footprint data.
 */
interface Footprint {
  key: number;
  type: string;
  name: string;
  content: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const StyledSplit = styled(Split)`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;

  .gutter {
    background-color: ${theme.colors.border};
    border-radius: 0.15rem;
    background-repeat: no-repeat;
    background-position: 50%;

    &:hover {
      background-color: ${theme.colors.buttonSecondaryHover};
    }

    &.gutter-horizontal {
      cursor: col-resize;
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
    }
  }
`;

const LeftPane = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0.5rem;

  @media (min-width: 640px) {
    padding: 1rem;
  }
`;

const MiddlePane = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const RightPane = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: ${theme.colors.backgroundLight};
`;

const FootprintList = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow-y: auto;
  gap: 0.25rem;
`;

const FootprintItem = styled.div<{ $active: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  background-color: ${(props) =>
    props.$active ? theme.colors.accentSecondary : 'transparent'};

  &:hover {
    background-color: ${(props) =>
      props.$active ? theme.colors.accentSecondary : theme.colors.buttonHover};
  }
`;

const FootprintName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${theme.fontSizes.bodySmall};
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.white};
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  opacity: 0.7;

  &:hover {
    opacity: 1;
    color: ${theme.colors.error};
  }

  .material-symbols-outlined {
    font-size: ${theme.fontSizes.iconSmall};
  }
`;

const EditorContainer = styled.div`
  flex-grow: 1;
  overflow: hidden;
`;

const NameInputContainer = styled.div`
  padding: 0.5rem;
  border-bottom: 1px solid ${theme.colors.border};
`;

const PreviewContainer = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;

  kicanvas-embed {
    width: 100%;
    height: 100%;
  }
`;

const PreviewPlaceholder = styled.div`
  color: ${theme.colors.textDark};
  text-align: center;
  font-size: ${theme.fontSizes.bodySmall};
`;

const PreviewHeader = styled.div`
  padding: 0.5rem 1rem;
  border-bottom: 1px solid ${theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PreviewButton = styled.button`
  background-color: ${theme.colors.accentSecondary};
  border: none;
  border-radius: 4px;
  color: white;
  padding: 0.25rem 0.75rem;
  cursor: pointer;
  font-size: ${theme.fontSizes.bodySmall};

  &:hover {
    background-color: ${theme.colors.accentDark};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${theme.colors.textDark};
  text-align: center;
  padding: 2rem;
  gap: 1rem;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: ${theme.colors.accentSecondary};
  border: none;
  border-radius: 4px;
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: ${theme.fontSizes.bodySmall};
  font-family: ${theme.fonts.body};
  margin-top: 0.5rem;
  width: 100%;

  &:hover {
    background-color: ${theme.colors.accentDark};
  }

  .material-symbols-outlined {
    font-size: ${theme.fontSizes.iconSmall};
  }
`;

/**
 * FootprintManager component for managing custom footprints.
 * Provides a list of footprints, an editor, and a preview panel.
 */
const FootprintManager = () => {
  const configContext = useConfigContext();
  const [previewPcb, setPreviewPcb] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewKeyRef = useRef(0);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!configContext) return null;

  const {
    injectionInput,
    setInjectionInput,
    footprintToEdit,
    setFootprintToEdit,
    createFootprint,
  } = configContext;

  // Extract footprints from injectionInput
  const footprints: Footprint[] = [];
  if (injectionInput && Array.isArray(injectionInput)) {
    for (let i = 0; i < injectionInput.length; i++) {
      const injection = injectionInput[i];
      if (injection.length === 3 && injection[0] === 'footprint') {
        footprints.push({
          key: i,
          type: injection[0],
          name: injection[1],
          content: injection[2],
        });
      }
    }
  }

  /**
   * Select a footprint to edit.
   */
  const handleSelectFootprint = (footprint: Footprint) => {
    setFootprintToEdit(footprint);
    setPreviewPcb(null);
    setPreviewError(null);
  };

  /**
   * Delete a footprint from the list.
   */
  const handleDeleteFootprint = (footprint: Footprint, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!Array.isArray(injectionInput)) return;

    const newInjections = injectionInput.filter((_, i) => i !== footprint.key);
    setInjectionInput(newInjections);

    // Reset selection if deleted footprint was being edited
    if (footprintToEdit.key === footprint.key) {
      setFootprintToEdit({ key: -1, type: '', name: '', content: '' });
    } else if (footprintToEdit.key > footprint.key) {
      // Re-index if current selection is after deleted item
      setFootprintToEdit({
        ...footprintToEdit,
        key: footprintToEdit.key - 1,
      });
    }
  };

  /**
   * Handle footprint name change.
   */
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFootprintToEdit({
      ...footprintToEdit,
      name: e.target.value,
    });
  };

  /**
   * Handle footprint code change.
   */
  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    setFootprintToEdit({
      ...footprintToEdit,
      content: value,
    });
  };

  /**
   * Effect to auto-save footprint changes to injectionInput.
   */
  useEffect(() => {
    if (footprintToEdit.key === -1) return;
    if (footprintToEdit.name === '') return;
    if (footprintToEdit.content === '') return;

    const editedInjection = [
      footprintToEdit.type,
      footprintToEdit.name,
      footprintToEdit.content,
    ];

    let injections: string[][] = [];
    if (Array.isArray(injectionInput)) {
      injections = [...injectionInput];
    }

    const nextIndex = injections.length;
    if (nextIndex === 0 || nextIndex === footprintToEdit.key) {
      // This is a new injection to add
      injections.push(editedInjection);
      setFootprintToEdit({ ...footprintToEdit, key: nextIndex });
    } else {
      const existingInjection = injections[footprintToEdit.key];
      if (
        existingInjection &&
        existingInjection[0] === footprintToEdit.type &&
        existingInjection[1] === footprintToEdit.name &&
        existingInjection[2] === footprintToEdit.content
      ) {
        // Nothing was changed
        return;
      }
      injections = injections.map((existing, i) => {
        if (i === footprintToEdit.key) {
          return editedInjection;
        }
        return existing;
      });
    }
    setInjectionInput(injections);
  }, [footprintToEdit, injectionInput, setInjectionInput, setFootprintToEdit]);

  /**
   * Generate a preview of the current footprint.
   */
  const handlePreview = useCallback(async () => {
    if (footprintToEdit.key === -1 || !footprintToEdit.content) return;

    previewKeyRef.current += 1;
    setIsPreviewLoading(true);
    setPreviewPcb(null);
    setPreviewError(null);

    try {
      // Create a minimal config that uses this footprint with outline
      // Position the point at the center of the board
      const testConfig = `
units:
  kx: 18
  ky: 17
  # KiCad sheet size: 400x300 (50x8, 50x6)
  sheet_width: 400
  sheet_height: 300
  board_size: 20
points:
  zones:
    matrix:
      anchor:
        shift: [sheet_width / 2, -sheet_height / 2]
      columns:
        col:
          rows:
            row:
outlines:
  board:
    - what: rectangle
      where:
        shift: [sheet_width / 2, -sheet_height / 2]
      size: [board_size, board_size]
pcbs:
  preview:
    template: kicad9
    outlines:
      main:
        outline: board
    footprints:
      test:
        what: ${footprintToEdit.name}
        where: true
`;

      // Create a temporary worker to generate preview
      const worker = new Worker(
        new URL('../workers/ergogen.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event) => {
        const response = event.data;
        if (response.type === 'success' && response.results) {
          // Get PCB content from results.pcbs.preview
          const pcbs = response.results.pcbs as Record<string, string> | undefined;
          if (pcbs && pcbs.preview) {
            setPreviewPcb(pcbs.preview);
            setPreviewError(null);
          } else {
            setPreviewError('No PCB output found in results');
          }
        } else if (response.type === 'error') {
          setPreviewError(response.error || 'Unknown error');
        }
        setIsPreviewLoading(false);
        worker.terminate();
      };

      worker.onerror = (error) => {
        setPreviewError(error.message || 'Worker error');
        setIsPreviewLoading(false);
        worker.terminate();
      };

      // Send the generation request
      worker.postMessage({
        type: 'generate',
        inputConfig: testConfig,
        injectionInput: [[footprintToEdit.type, footprintToEdit.name, footprintToEdit.content]],
      });
    } catch (error) {
      console.error('Preview generation failed:', error);
      setPreviewError(error instanceof Error ? error.message : 'Unknown error');
      setIsPreviewLoading(false);
    }
  }, [footprintToEdit]);

  /**
   * Auto-preview when footprint is selected (with debounce).
   */
  useEffect(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    if (footprintToEdit.key !== -1 && footprintToEdit.content) {
      previewTimeoutRef.current = setTimeout(() => {
        handlePreview();
      }, 300);
    }

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [footprintToEdit.key, footprintToEdit.name, handlePreview]);

  return (
    <Container>
      <StyledSplit
        direction="horizontal"
        sizes={[20, 50, 30]}
        minSize={[150, 200, 150]}
        gutterSize={5}
        snapOffset={0}
      >
        <LeftPane>
          <Title>Custom Footprints</Title>
          <FootprintList>
            {footprints.length === 0 ? (
              <EmptyState>
                <span>No custom footprints yet</span>
              </EmptyState>
            ) : (
              footprints.map((fp) => (
                <FootprintItem
                  key={fp.key}
                  $active={footprintToEdit.key === fp.key}
                  onClick={() => handleSelectFootprint(fp)}
                >
                  <FootprintName>{fp.name}</FootprintName>
                  <DeleteButton
                    onClick={(e) => handleDeleteFootprint(fp, e)}
                    aria-label={`Delete ${fp.name}`}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </DeleteButton>
                </FootprintItem>
              ))
            )}
          </FootprintList>
          <AddButton
            onClick={() => createFootprint()}
            aria-label="Add new custom footprint"
          >
            <span className="material-symbols-outlined">add</span>
            Add Footprint
          </AddButton>
        </LeftPane>

        <MiddlePane>
          {footprintToEdit.key !== -1 ? (
            <>
              <NameInputContainer>
                <Title as="h4">Footprint Name</Title>
                <Input
                  value={footprintToEdit.name}
                  onChange={handleNameChange}
                  placeholder="Enter footprint name"
                  aria-label="Footprint name"
                />
              </NameInputContainer>
              <EditorContainer>
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  language="javascript"
                  value={footprintToEdit.content}
                  onChange={handleCodeChange}
                  theme="ergogen-theme"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </EditorContainer>
            </>
          ) : (
            <EmptyState>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>
                code
              </span>
              <span>Select a footprint to edit or create a new one</span>
            </EmptyState>
          )}
        </MiddlePane>

        <RightPane>
          <PreviewHeader>
            <Title as="h4">Preview</Title>
            <PreviewButton
              onClick={handlePreview}
              disabled={footprintToEdit.key === -1 || isPreviewLoading}
            >
              {isPreviewLoading ? 'Loading...' : 'Refresh'}
            </PreviewButton>
          </PreviewHeader>
          <PreviewContainer>
            {previewPcb ? (
              <kicanvas-embed
                key={`footprint-preview-${previewKeyRef.current}`}
                controls="basic"
                controlslist="nooverlay"
                theme="kicad"
                zoom="fit"
                aria-label="Footprint preview"
              >
                <kicanvas-source type="board">{previewPcb}</kicanvas-source>
              </kicanvas-embed>
            ) : previewError ? (
              <PreviewPlaceholder style={{ color: theme.colors.error }}>
                Error: {previewError}
              </PreviewPlaceholder>
            ) : (
              <PreviewPlaceholder>
                {footprintToEdit.key === -1
                  ? 'Select a footprint to preview'
                  : isPreviewLoading
                    ? 'Generating preview...'
                    : 'No preview available'}
              </PreviewPlaceholder>
            )}
          </PreviewContainer>
        </RightPane>
      </StyledSplit>
    </Container>
  );
};

export default FootprintManager;
