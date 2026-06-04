import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ParamsContext = createContext({});

function getLocation() {
    return {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
    };
}

function pathToParts(path) {
    return path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

function matchRoute(pattern, pathname) {
    const patternParts = pathToParts(pattern);
    const pathParts = pathToParts(pathname);

    if (patternParts.length !== pathParts.length) {
        return null;
    }

    const params = {};
    for (let i = 0; i < patternParts.length; i += 1) {
        const patternPart = patternParts[i];
        const pathPart = pathParts[i];

        if (patternPart.startsWith(':')) {
            params[patternPart.slice(1)] = decodeURIComponent(pathPart);
        } else if (patternPart !== pathPart) {
            return null;
        }
    }

    return params;
}

function navigateTo(to) {
    const url = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

export function BrowserRouter({ children }) {
    return children;
}

export function Routes({ children }) {
    const location = useLocation();
    const routes = React.Children.toArray(children);

    for (const route of routes) {
        if (!React.isValidElement(route)) continue;
        const params = matchRoute(route.props.path || '/', location.pathname);
        if (!params) continue;

        return (
            <ParamsContext.Provider value={params}>
                {route.props.element}
            </ParamsContext.Provider>
        );
    }

    return null;
}

export function Route() {
    return null;
}

export function Link({ to, onClick, replace: _replace, reloadDocument, ...props }) {
    const href = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`;

    const handleClick = (event) => {
        onClick?.(event);
        if (
            event.defaultPrevented ||
            reloadDocument ||
            event.button !== 0 ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey
        ) {
            return;
        }

        event.preventDefault();
        navigateTo(href);
    };

    return <a href={href} onClick={handleClick} {...props} />;
}

export function useLocation() {
    const [location, setLocation] = useState(() => getLocation());

    useEffect(() => {
        const update = () => setLocation(getLocation());
        window.addEventListener('popstate', update);
        return () => window.removeEventListener('popstate', update);
    }, []);

    return location;
}

export function useParams() {
    return useContext(ParamsContext);
}

export function useNavigate() {
    return navigateTo;
}

export function useSearchParams() {
    const location = useLocation();
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const setParams = (nextParams) => {
        const query = new URLSearchParams(nextParams).toString();
        navigateTo(`${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    };
    return [params, setParams];
}
