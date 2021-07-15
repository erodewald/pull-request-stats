const core = require('@actions/core');
const { fetchPullRequests } = require('../fetchers');
const { parsePullRequest } = require('../parsers');

const ownerFilter = ({ org, repos }) => {
  if (org) return `org:${org}`;
  return (repos || []).map((r) => `repo:${r}`).join(' ');
};

const buildQuery = ({ org, repos, startDate }) => {
  const dateFilter = `created:>=${startDate.toISOString()}`;
  return `type:pr -review:none sort:author-date ${ownerFilter({ org, repos })} ${dateFilter}`;
};

const getPullRequests = async (params) => {
  const { limit } = params;
  const data = await fetchPullRequests(params);
  core.debug(`getPullRequests() data: ${JSON.stringify(data)}`);
  const results = data.search.edges.map(parsePullRequest);
  if (results && results.length > 0) {
    core.debug(`getPullRequests() results: ${JSON.stringify(results)}`);
  }
  if (results.length < limit) return results;

  const last = results[results.length - 1].cursor;
  return results.concat(await getPullRequests({ ...params, after: last }));
};

module.exports = ({
  octokit,
  org,
  repos,
  startDate,
  itemsPerPage = 100,
}) => {
  const search = buildQuery({ org, repos, startDate });
  core.debug(`getPullRequests(${search})`);
  return getPullRequests({ octokit, search, limit: itemsPerPage });
};
