import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useConfigContext } from '../context/ConfigContext';
import { theme } from '../theme/theme';

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

const Banners = () => {
  const configContext = useConfigContext();

  if (!configContext) {
    return null;
  }

  const { error, deprecationWarning, clearError, clearWarning, createFootprint } = configContext;

  // Check if the error is about a missing footprint
  const missingFootprintName = useMemo(() => {
    if (!error) return null;
    return extractMissingFootprintName(error);
  }, [error]);

  /**
   * Handles creating a footprint from the error banner.
   */
  const handleCreateFootprint = () => {
    if (missingFootprintName) {
      createFootprint(missingFootprintName);
      clearError();
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
            <BannerText>{error}</BannerText>
          </BannerContent>
          <BannerActions>
            {missingFootprintName && (
              <CreateFootprintButton
                onClick={handleCreateFootprint}
                aria-label={`Create footprint ${missingFootprintName}`}
                data-testid="create-footprint-button"
              >
                Create "{missingFootprintName}"
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
