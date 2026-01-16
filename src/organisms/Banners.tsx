import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useConfigContext } from '../context/ConfigContext';
import { theme } from '../theme/theme';

/**
 * Parsed error information for better display.
 */
type ParsedError = {
  type: 'footprint_not_found' | 'field_error' | 'yaml_error' | 'generic';
  message: string;
  details?: string;
  footprintName?: string;
  fieldPath?: string;
  availableOptions?: string[];
};

/**
 * Extracts the footprint config name from a path like "pcbs.mypcb.footprints.diode1"
 */
const extractFootprintConfigName = (path: string): string | null => {
  const match = path.match(/\.footprints\.([^.]+)$/);
  return match ? match[1] : null;
};

/**
 * Parses an error message and extracts structured information.
 */
const parseError = (error: string): ParsedError => {
  // Pattern: Field "pcbs.xxx.footprints.yyy.what" should be one of [...]!
  const footprintFieldMatch = error.match(
    /Field "([^"]*\.footprints\.[^"]*\.what)" should be one of \[([^\]]+)\]!/
  );
  if (footprintFieldMatch) {
    const fieldPath = footprintFieldMatch[1];
    const availableList = footprintFieldMatch[2];
    const footprintConfigPath = fieldPath.replace('.what', '');
    const footprintConfigName = extractFootprintConfigName(footprintConfigPath);
    return {
      type: 'footprint_not_found',
      message: `Footprint type not found`,
      details: footprintConfigName
        ? `"${footprintConfigName}" uses an unknown footprint type`
        : `Check the "what" field in: ${footprintConfigPath}`,
      fieldPath: footprintConfigPath,
      footprintName: footprintConfigName || undefined,
      availableOptions: availableList.split(', ').slice(0, 20),
    };
  }

  // Pattern: Field "xxx" should be one of [...]! (generic field error)
  const fieldInMatch = error.match(/Field "([^"]+)" should be one of \[([^\]]+)\]!/);
  if (fieldInMatch) {
    const fieldPath = fieldInMatch[1];
    const availableList = fieldInMatch[2];
    if (fieldPath.includes('footprints')) {
      const footprintConfigName = extractFootprintConfigName(fieldPath.replace(/\.[^.]+$/, ''));
      return {
        type: 'footprint_not_found',
        message: `Invalid value for field`,
        details: footprintConfigName
          ? `"${footprintConfigName}" has an invalid configuration`
          : fieldPath,
        fieldPath,
        footprintName: footprintConfigName || undefined,
        availableOptions: availableList.split(', ').slice(0, 20),
      };
    }
    return {
      type: 'field_error',
      message: `Invalid value for "${fieldPath}"`,
      details: `Should be one of: ${availableList.split(', ').slice(0, 10).join(', ')}${availableList.split(', ').length > 10 ? '...' : ''}`,
      fieldPath,
    };
  }

  // Pattern: Field "xxx" should be of type yyy!
  const fieldTypeMatch = error.match(/Field "([^"]+)" should be of type ([^!]+)!/);
  if (fieldTypeMatch) {
    return {
      type: 'field_error',
      message: `Type error in "${fieldTypeMatch[1]}"`,
      details: `Expected type: ${fieldTypeMatch[2]}`,
      fieldPath: fieldTypeMatch[1],
    };
  }

  // Pattern: Unexpected key "xxx" within field "yyy"!
  const unexpectedKeyMatch = error.match(/Unexpected key "([^"]+)" within field "([^"]+)"!/);
  if (unexpectedKeyMatch) {
    return {
      type: 'field_error',
      message: `Unknown key "${unexpectedKeyMatch[1]}"`,
      details: `In field: ${unexpectedKeyMatch[2]}`,
      fieldPath: unexpectedKeyMatch[2],
    };
  }

  // Pattern: Unknown point reference "xxx" in anchor "yyy"!
  const unknownPointMatch = error.match(/Unknown point reference "([^"]+)" in anchor "([^"]+)"!/);
  if (unknownPointMatch) {
    return {
      type: 'field_error',
      message: `Unknown point reference "${unknownPointMatch[1]}"`,
      details: `In anchor: ${unknownPointMatch[2]}`,
      fieldPath: unknownPointMatch[2],
    };
  }

  // Pattern: Input does not contain a points clause!
  if (error.includes('does not contain a points clause')) {
    return {
      type: 'field_error',
      message: 'Missing "points" section',
      details: 'Your configuration needs a "points" section to define key positions',
    };
  }

  // Pattern: Input does not contain any points!
  if (error.includes('does not contain any points')) {
    return {
      type: 'field_error',
      message: 'No points defined',
      details: 'Your configuration has a "points" section but no keys are defined',
    };
  }

  // YAML/JSON parsing errors
  if (error.includes('YAML') || error.includes('JSON') || error.includes('parsing') || error.includes('YAMLException')) {
    return {
      type: 'yaml_error',
      message: 'Configuration syntax error',
      details: error,
    };
  }

  // Footprint injection errors
  if (error.includes('SyntaxError') || error.includes('ReferenceError') || error.includes('TypeError')) {
    return {
      type: 'field_error',
      message: 'JavaScript error in custom footprint',
      details: error,
    };
  }

  // Generic error
  return {
    type: 'generic',
    message: error.length > 150 ? error.substring(0, 150) + '...' : error,
    details: error.length > 150 ? error : undefined,
  };
};

/**
 * Extracts a missing footprint name from an error message.
 * Returns null if no footprint-related error is detected.
 */
const extractMissingFootprintName = (error: string): string | null => {
  // Match patterns like "Unknown footprint type: xxx" or "footprint 'xxx' not found"
  const patterns = [
    /Unknown footprint type:\s*['"]?([^'"]+)['"]?/i,
    /footprint\s+['"]([^'"]+)['"]\s+not found/i,
    /Unknown type\s+['"]?([^'"]+)['"]?\s+in\s+footprints/i,
    /Point reference ['"]([^'"]+)['"]\s+of type\s+footprint\s+not found/i,
  ];

  for (const pattern of patterns) {
    const match = error.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

const bannerColors = {
  info: {
    background: theme.colors.info,
    text: theme.colors.infoDark,
  },
  warning: {
    background: theme.colors.warning,
    text: theme.colors.warningDark,
  },
  error: {
    background: theme.colors.error,
    text: theme.colors.errorDark,
  },
  success: {
    background: theme.colors.success,
    text: theme.colors.successDark,
  },
  text: theme.colors.text,
};

const BannerIcon = styled.span.attrs({
  className: 'material-symbols-outlined',
})`
  font-size: ${theme.fontSizes.iconLarge};
  margin-right: 1rem;
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
`;

const BannerText = styled.p`
  margin: 0;
`;

const Banner = styled.div<{ type: 'info' | 'warning' | 'error' | 'success' }>`
  padding: 1rem 1.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: ${bannerColors.text};
  background-color: ${({ type }) => bannerColors[type].background};
  border: 1px solid ${({ type }) => bannerColors[type].text};

  .material-symbols-outlined {
    color: ${({ type }) => bannerColors[type].text};
  }
`;

const BannersContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 800px;
  padding: 0 1rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${bannerColors.text};
  font-size: ${theme.fontSizes.h3};
  cursor: pointer;
  padding: 0;
  line-height: 1;
  margin-left: auto;
  padding-left: 1rem;
`;

const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  flex-shrink: 0;
`;

const CreateFootprintButton = styled.button`
  background-color: ${theme.colors.accent};
  border: none;
  border-radius: 4px;
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: ${theme.fontSizes.bodySmall};
  font-family: ${theme.fonts.body};
  white-space: nowrap;

  &:hover {
    background-color: ${theme.colors.accentDark};
  }
`;

const ErrorTitle = styled.span`
  font-weight: bold;
  display: block;
  margin-bottom: 0.25rem;
`;

const ErrorDetails = styled.span`
  font-size: ${theme.fontSizes.bodySmall};
  opacity: 0.9;
  display: block;
  word-break: break-word;
`;

const ErrorPath = styled.code`
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  font-family: monospace;
  font-size: ${theme.fontSizes.bodySmall};
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${bannerColors.text};
  font-size: ${theme.fontSizes.bodySmall};
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  margin-top: 0.25rem;

  &:hover {
    opacity: 0.8;
  }
`;

const AvailableOptions = styled.div`
  margin-top: 0.5rem;
  font-size: ${theme.fontSizes.bodySmall};
  max-height: 100px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  border-radius: 4px;
`;

const OptionTag = styled.span`
  display: inline-block;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  margin: 0.1rem;
  font-family: monospace;
  font-size: 0.75rem;
`;

const Banners = () => {
  const configContext = useConfigContext();
  const [showOptions, setShowOptions] = useState(false);

  const error = configContext?.error ?? null;
  const deprecationWarning = configContext?.deprecationWarning ?? null;

  // Parse the error for better display
  const parsedError = useMemo(() => {
    if (!error) return null;
    return parseError(error);
  }, [error]);

  // Check if the error is about a missing footprint (legacy support)
  const missingFootprintName = useMemo(() => {
    if (!error) return null;
    return extractMissingFootprintName(error);
  }, [error]);

  if (!configContext) {
    return null;
  }

  const { clearError, clearWarning, createFootprint } = configContext;

  /**
   * Handles creating a footprint from the error banner.
   */
  const handleCreateFootprint = () => {
    if (missingFootprintName) {
      createFootprint(missingFootprintName);
      clearError();
    }
  };

  /**
   * Renders the error content based on parsed error type.
   */
  const renderErrorContent = () => {
    if (!parsedError) return null;

    switch (parsedError.type) {
      case 'footprint_not_found':
        return (
          <BannerText>
            <ErrorTitle>Footprint not found</ErrorTitle>
            {parsedError.fieldPath && (
              <ErrorDetails>
                Location: <ErrorPath>{parsedError.fieldPath}</ErrorPath>
              </ErrorDetails>
            )}
            {parsedError.availableOptions && parsedError.availableOptions.length > 0 && (
              <>
                <ExpandButton onClick={() => setShowOptions(!showOptions)}>
                  {showOptions ? 'Hide' : 'Show'} available footprints ({parsedError.availableOptions.length}+)
                </ExpandButton>
                {showOptions && (
                  <AvailableOptions>
                    {parsedError.availableOptions.map((opt, idx) => (
                      <OptionTag key={idx}>{opt}</OptionTag>
                    ))}
                    {parsedError.availableOptions.length >= 20 && <span>...</span>}
                  </AvailableOptions>
                )}
              </>
            )}
          </BannerText>
        );

      case 'field_error':
        return (
          <BannerText>
            <ErrorTitle>{parsedError.message}</ErrorTitle>
            {parsedError.details && <ErrorDetails>{parsedError.details}</ErrorDetails>}
          </BannerText>
        );

      case 'yaml_error':
        return (
          <BannerText>
            <ErrorTitle>{parsedError.message}</ErrorTitle>
            {parsedError.details && (
              <ErrorDetails style={{ maxHeight: '100px', overflow: 'auto' }}>
                {parsedError.details}
              </ErrorDetails>
            )}
          </BannerText>
        );

      default:
        return (
          <BannerText>
            <ErrorTitle>Error</ErrorTitle>
            <ErrorDetails>{parsedError.message}</ErrorDetails>
          </BannerText>
        );
    }
  };

  return (
    <BannersContainer data-testid="banners-container">
      {deprecationWarning && (
        <Banner type="warning" data-testid="warning-banner">
          <BannerContent>
            <BannerIcon>warning</BannerIcon>
            <BannerText>{deprecationWarning}</BannerText>
          </BannerContent>
          <CloseButton
            onClick={clearWarning}
            aria-label="Close warning message"
            data-testid="close-warning-banner"
          >
            &times;
          </CloseButton>
        </Banner>
      )}
      {error && (
        <Banner type="error" data-testid="error-banner">
          <BannerContent>
            <BannerIcon>error</BannerIcon>
            {renderErrorContent()}
          </BannerContent>
          <BannerActions>
            {(parsedError?.type === 'footprint_not_found' || missingFootprintName) && (
              <CreateFootprintButton
                onClick={handleCreateFootprint}
                aria-label={`Create footprint`}
                data-testid="create-footprint-button"
              >
                Create Footprint
              </CreateFootprintButton>
            )}
            <CloseButton
              onClick={clearError}
              aria-label="Close error message"
              data-testid="close-error-banner"
            >
              &times;
            </CloseButton>
          </BannerActions>
        </Banner>
      )}
    </BannersContainer>
  );
};

export default Banners;
